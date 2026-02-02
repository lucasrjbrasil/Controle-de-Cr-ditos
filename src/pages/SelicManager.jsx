import { useState, useMemo, useEffect } from 'react';
import { Search, History, Plus, Pencil, Trash2, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSelic } from '../hooks/useSelic';
import { useColumnResize } from '../hooks/useColumnResize';
import ResizableTh from '../components/ui/ResizableTh';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useToast } from '../context/ToastContext';
import Modal from '../components/ui/Modal';

export default function SelicManager() {
    const { rates, updateRate, removeRate, loading, error, batchUpdateRates } = useSelic();
    const toast = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingDate, setEditingDate] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const { columnWidths, handleResize, getColumnWidth } = useColumnResize({
        data: 200,
        taxa: 150,
        status: 150,
        actions: 120
    });

    const filteredRates = useMemo(() => {
        if (!rates || !Array.isArray(rates)) return [];

        try {
            const parseToDateValue = (dateStr) => {
                if (!dateStr) return 0;
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const [day, month, year] = parts;
                    return parseInt(year) * 100 + parseInt(month);
                } else if (parts.length === 2) {
                    const [month, year] = parts;
                    return parseInt(year) * 100 + parseInt(month);
                }
                return 0;
            };

            const sorted = [...rates].sort((a, b) => {
                return parseToDateValue(b.data) - parseToDateValue(a.data);
            });

            return sorted.filter(r => {
                const searchStr = searchTerm.toLowerCase();
                const dateMatches = r?.data && r.data.includes(searchTerm);

                let valMatches = false;
                if (r?.valor) {
                    if (typeof r.valor === 'object') {
                        valMatches = String(r.valor.buy).includes(searchTerm) || String(r.valor.sell).includes(searchTerm);
                    } else {
                        valMatches = String(r.valor).includes(searchTerm);
                    }
                }

                return dateMatches || valMatches;
            });
        } catch (err) {
            console.error("Error filtering rates:", err);
            return [];
        }
    }, [rates, searchTerm]);

    const totalPages = Math.ceil(filteredRates.length / itemsPerPage);
    const paginatedRates = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredRates.slice(start, start + itemsPerPage);
    }, [filteredRates, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const startEditing = (rate) => {
        setEditingDate(rate.data);
        const val = rate.valor;
        setEditValue(typeof val === 'object' && val !== null ? val.buy : val);
    };

    const cancelEditing = () => {
        setEditingDate(null);
        setEditValue('');
    };

    const saveEditing = () => {
        if (editingDate && editValue) {
            updateRate(editingDate, editValue);
            setEditingDate(null);
            setEditValue('');
        }
    };

    const handleDelete = (date) => {
        const displayDate = date.length === 10 ? date.substring(3) : date;
        if (window.confirm(`Tem certeza que deseja excluir/restaurar a taxa de ${displayDate}?`)) {
            try {
                removeRate(date);
            } catch (error) {
                toast.error('Erro ao excluir: ' + error.message);
            }
        }
    };

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newRateData, setNewRateData] = useState({ date: '', value: '', source: 'MANUAL' });
    const [isBatchOpen, setIsBatchOpen] = useState(false);
    const [batchRange, setBatchRange] = useState({ start: '', end: '' });
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);

    const handleAddRate = (e) => {
        e.preventDefault();
        if (newRateData.date && newRateData.value) {
            try {
                updateRate(newRateData.date, newRateData.value, newRateData.source);
                setIsAddOpen(false);
                setNewRateData({ date: '', value: '', source: 'MANUAL' });
            } catch (err) {
                toast.error("Erro ao adicionar taxa: " + err.message);
            }
        } else {
            toast.warning("Preencha todos os campos");
        }
    };

    const handleBatchImport = async (e) => {
        e.preventDefault();
        if (!batchRange.start || !batchRange.end) {
            toast.warning("Preencha o intervalo (Início e Fim)");
            return;
        }

        try {
            setIsImporting(true);
            setImportProgress(0);

            const [startM, startY] = batchRange.start.split('/');
            const [endM, endY] = batchRange.end.split('/');

            if (!startM || !startY || !endM || !endY) throw new Error("Formato inválido. Use MM/AAAA");

            const startDate = new Date(parseInt(startY), parseInt(startM) - 1, 1);
            const endDate = new Date(parseInt(endY), parseInt(endM) - 1, 1);

            if (startDate > endDate) throw new Error("A data de início deve ser anterior à data de fim");

            const monthsToFetch = [];
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                monthsToFetch.push({
                    month: (currentDate.getMonth() + 1).toString().padStart(2, '0'),
                    year: currentDate.getFullYear().toString()
                });
                currentDate.setMonth(currentDate.getMonth() + 1);
            }

            const { bcbService } = await import('../services/bcbService');
            const updates = [];
            let successes = 0;

            for (let i = 0; i < monthsToFetch.length; i++) {
                const { month, year } = monthsToFetch[i];
                const dateKey = `${month}/${year}`;
                try {
                    const value = await bcbService.fetchRateForMonth(month, year);
                    if (value) {
                        updates.push({ date: dateKey, value, source: 'BCB' });
                        successes++;
                    }
                } catch (err) {
                    console.error(`Error fetching for ${dateKey}:`, err);
                }
                setImportProgress(Math.round(((i + 1) / monthsToFetch.length) * 100));
            }

            if (updates.length > 0) {
                batchUpdateRates(updates);
                toast.success(`Importação concluída! ${successes} taxas importadas.`);
            } else {
                toast.info("Nenhuma taxa encontrada para o período informado.");
            }

            setIsBatchOpen(false);
            setBatchRange({ start: '', end: '' });
        } catch (error) {
            toast.error("Erro na importação: " + error.message);
        } finally {
            setIsImporting(false);
            setImportProgress(0);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando histórico Selic...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Erro ao carregar Selic: {error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <History className="text-blue-600" />
                        Histórico Selic
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        Acompanhe e gerencie as taxas Selic mensais.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => setIsBatchOpen(true)}
                        className="flex items-center gap-2"
                    >
                        <History size={18} />
                        <span className="hidden sm:inline">Importar Intervalo</span>
                        <span className="sm:hidden">Importar</span>
                    </Button>
                    <Button
                        onClick={() => setIsAddOpen(true)}
                        className="flex items-center gap-2"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Adicionar Taxa</span>
                        <span className="sm:hidden">Adicionar</span>
                    </Button>
                    <div className="relative w-full md:w-64">
                        <Input
                            icon={Search}
                            placeholder="Buscar mês/ano..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="text-sm"
                        />
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                title="Adicionar Taxa Selic"
                maxWidth="sm"
            >
                <form onSubmit={handleAddRate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Mês/Ano (MM/AAAA)</label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Input
                                    placeholder="01/2026"
                                    value={newRateData.date}
                                    onChange={e => setNewRateData({ ...newRateData, date: e.target.value })}
                                    required
                                />
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={async () => {
                                    if (!newRateData.date || newRateData.date.length < 7) {
                                        toast.warning("Digite o Mês/Ano (MM/AAAA) primeiro.");
                                        return;
                                    }
                                    const [m, y] = newRateData.date.split('/');
                                    if (!m || !y) return;
                                    try {
                                        const { bcbService } = await import('../services/bcbService');
                                        const val = await bcbService.fetchRateForMonth(m, y);
                                        if (val) {
                                            setNewRateData({ ...newRateData, value: val, source: 'BCB' });
                                        } else {
                                            toast.info("Taxa não encontrada no BCB para este período.");
                                        }
                                    } catch (e) {
                                        toast.error("Erro ao buscar no BCB.");
                                    }
                                }}
                                className="whitespace-nowrap"
                            >
                                Buscar BCB
                            </Button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Taxa (%)</label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.90"
                            value={newRateData.value}
                            onChange={e => setNewRateData({ ...newRateData, value: e.target.value })}
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                        <Button type="submit">Salvar</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isBatchOpen}
                onClose={() => setIsBatchOpen(false)}
                title="Importar Intervalo (BCB)"
                maxWidth="sm"
            >
                <form onSubmit={handleBatchImport} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Início (MM/AAAA)</label>
                            <Input
                                placeholder="01/2024"
                                value={batchRange.start}
                                onChange={e => setBatchRange({ ...batchRange, start: e.target.value })}
                                required
                                disabled={isImporting}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Fim (MM/AAAA)</label>
                            <Input
                                placeholder="12/2024"
                                value={batchRange.end}
                                onChange={e => setBatchRange({ ...batchRange, end: e.target.value })}
                                required
                                disabled={isImporting}
                            />
                        </div>
                    </div>

                    {isImporting && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium text-slate-500">
                                <span>Processando...</span>
                                <span>{importProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${importProgress}%` }} />
                            </div>
                            <p className="text-[10px] text-slate-400 text-center italic">Buscando dados no servidor do Banco Central...</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button type="button" variant="secondary" onClick={() => setIsBatchOpen(false)} disabled={isImporting}>Cancelar</Button>
                        <Button type="submit" disabled={isImporting} className="flex items-center gap-2">
                            {isImporting ? 'Importando...' : 'Iniciar Importação'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm h-[600px] flex flex-col">
                <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <ResizableTh width={getColumnWidth('data')} onResize={(w) => handleResize('data', w)} className="px-6 py-4">Data (Mês/Ano)</ResizableTh>
                                <ResizableTh width={getColumnWidth('taxa')} onResize={(w) => handleResize('taxa', w)} className="px-6 py-4">Taxa (%)</ResizableTh>
                                <ResizableTh width={getColumnWidth('status')} onResize={(w) => handleResize('status', w)} className="px-6 py-4 text-center"><div className="w-full text-center">Status</div></ResizableTh>
                                <ResizableTh width={getColumnWidth('actions')} onResize={(w) => handleResize('actions', w)} className="px-6 py-4 text-right"><div className="w-full text-right">Ações</div></ResizableTh>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {paginatedRates.map((rate, index) => {
                                if (!rate || !rate.data) return null;
                                const isEditing = editingDate === rate.data;
                                return (
                                    <tr key={rate.data || index} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${rate.isOverridden ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                                        <td className="px-6 py-3 font-mono text-slate-600 dark:text-slate-300">
                                            {rate.data.includes('/') && rate.data.split('/').length === 3 ? rate.data.substring(3) : rate.data}
                                        </td>
                                        <td className="px-6 py-3">
                                            {isEditing ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="bg-white dark:bg-slate-800 border border-blue-300 rounded px-2 py-1 w-24 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        autoFocus
                                                    />
                                                    <span className="text-slate-400">%</span>
                                                </div>
                                            ) : (
                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                    {typeof rate.valor === 'object' && rate.valor !== null ? (rate.valor.buy || rate.valor.sell) : rate.valor}%
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${rate.source === 'BCB' || rate.source === 'OFFICIAL'
                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                }`}>
                                                {rate.source === 'BCB' || rate.source === 'OFFICIAL' ? 'Oficial' : 'Manual'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button onClick={saveEditing} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Confirmar"><Check size={18} /></button>
                                                        <button onClick={cancelEditing} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Cancelar"><X size={18} /></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEditing(rate)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Editar"><Pencil size={16} /></button>
                                                        {rate.isOverridden && (
                                                            <button onClick={() => handleDelete(rate.data)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Restaurar/Excluir"><Trash2 size={16} /></button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Mostrando {Math.min(filteredRates.length, (currentPage - 1) * itemsPerPage + 1)} a {Math.min(filteredRates.length, currentPage * itemsPerPage)} de {filteredRates.length} taxas
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="iconSm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="disabled:opacity-30"
                            >
                                <ChevronLeft size={18} />
                            </Button>

                            <div className="flex items-center gap-1">
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <Button
                                variant="ghost"
                                size="iconSm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="disabled:opacity-30"
                            >
                                <ChevronRight size={18} />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


