import { useState, useMemo, useCallback } from 'react';
import { Plus, Search, Filter, Pencil, Trash2, FileText, AlertCircle, CheckCircle, Clock, Download, Upload, RotateCcw } from 'lucide-react';
import PerdcompForm from '../features/perdcomp/components/PerdcompForm';
import UploadPerdcompModal from '../features/perdcomp/components/UploadPerdcompModal';
import { usePerdcomp } from '../context/PerdcompContext';
import { useColumnResize } from '../hooks/useColumnResize';
import ResizableTh from '../components/ui/ResizableTh';
import { useCredits } from '../context/CreditsContext';
import { formatCurrency } from '../utils/formatters';
import { exportToExcel } from '../utils/exportUtils';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function PerdcompManager() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const toast = useToast();
    const { columnWidths, handleResize, getColumnWidth } = useColumnResize({
        creditId: 80,
        numero: 120,
        data: 100,
        empresa: 150,
        tipo: 100,
        codigo: 80,
        periodo: 100,
        vencimento: 100,
        principal: 110,
        multa: 100,
        juros: 100,
        total: 110,
        modified_by: 150,
        actions: 80
    });
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [competencyDate, setCompetencyDate] = useState(''); // Empty by default (show all)
    const [filterType, setFilterType] = useState('apuracao'); // 'apuracao' | 'transmissao'
    const { perdcomps, removePerdcomp, refreshPerdcomps } = usePerdcomp();
    const { credits, refreshCredits } = useCredits();

    const handleEdit = (item) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Tem certeza que deseja excluir esta PERDCOMP?')) {
            removePerdcomp(id);
        }
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingItem(null);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([refreshPerdcomps(), refreshCredits()]);
            toast.success('Dados atualizados com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
            toast.error('Erro ao atualizar dados.');
        } finally {
            setIsRefreshing(false);
        }
    };

    // Create a Map for O(1) credit lookup instead of O(n) find
    const creditMap = useMemo(() => {
        const map = new Map();
        credits.forEach(c => map.set(c.id, c));
        return map;
    }, [credits]);

    // Memoized getCreditInfo using Map lookup
    const getCreditInfo = useCallback((creditId) => {
        return creditMap.get(creditId) || { empresa: 'Desconhecido', codigoReceita: '---', tipoCredito: '---' };
    }, [creditMap]);

    // Filter Logic
    const filteredPerdcomps = useMemo(() => {
        let filtered = perdcomps;

        // Date Filter
        if (competencyDate) {
            if (filterType === 'apuracao') {
                const [year, month] = competencyDate.split('-');
                const targetPeriod = `${month}/${year}`;
                filtered = filtered.filter(item => item.periodoApuracao === targetPeriod);
            } else {
                // filterType === 'transmissao'
                // competencyDate is YYYY-MM, dataCriacao is ISO string YYYY-MM-DD...
                filtered = filtered.filter(item => item.dataCriacao.startsWith(competencyDate));
            }
        }

        if (!searchTerm) return filtered;

        const lowerTerm = searchTerm.toLowerCase();
        return filtered.filter(item => {
            const credit = getCreditInfo(item.creditId);
            return (
                item.numero.toLowerCase().includes(lowerTerm) ||
                credit.empresa.toLowerCase().includes(lowerTerm) ||
                credit.codigoReceita.toLowerCase().includes(lowerTerm)
            );
        });
    }, [perdcomps, searchTerm, competencyDate, filterType, getCreditInfo]);

    const handleExport = () => {
        if (filteredPerdcomps.length === 0) return;

        const dataToExport = filteredPerdcomps.map(item => {
            const credit = getCreditInfo(item.creditId);
            return {
                "ID Crédito": credit.id ? `#${credit.id.toString().slice(-4)}` : '---',
                "Número PERDCOMP": item.numero,
                "Data Transmissão": new Date(item.dataCriacao).toLocaleDateString(),
                "Empresa": credit.empresa,
                "Tipo Crédito": credit.tipoCredito,
                "Código Imposto": item.codigoImposto,
                "Período Apuração": item.periodoApuracao,
                "Vencimento": item.vencimento ? new Date(item.vencimento).toLocaleDateString() : '',
                "Valor Principal": item.valorPrincipal,
                "Multa": item.multa,
                "Juros": item.juros,
                "Total Compensado": item.valorCompensado,
                "Pedido de Restituição": item.isRestituicao ? 'Sim' : 'Não',
                "Modificado por": item.modified_by ? `${item.modified_by} (${new Date(item.modified_at).toLocaleDateString()})` : ''
            };
        });

        exportToExcel(dataToExport, `Relatorio_PERDCOMPs_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setCompetencyDate('');
        setFilterType('apuracao');
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Homologado': return <CheckCircle className="text-emerald-500" size={16} />;
            case 'Indeferido': return <AlertCircle className="text-red-500" size={16} />;
            default: return <Clock className="text-amber-500" size={16} />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gerenciamento de PERDCOMPs</h2>
                    <p className="text-slate-500 dark:text-slate-400">Controle seus pedidos eletrônicos de restituição.</p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={handleRefresh}
                        className="gap-2"
                        disabled={isRefreshing}
                        title="Atualizar dados"
                    >
                        <RotateCcw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleExport}
                        className="gap-2"
                    >
                        <Download size={20} />
                        Exportar Excel
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setIsUploadOpen(true)}
                        className="gap-2"
                    >
                        <Upload size={20} />
                        Upload PERDCOMP
                    </Button>
                    <Button
                        onClick={() => setIsFormOpen(true)}
                        className="gap-2"
                    >
                        <Plus size={20} />
                        Nova PERDCOMP
                    </Button>
                </div>
            </div>

            {/* Filters / Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Input
                        icon={Search}
                        placeholder="Pesquisar por Número, Empresa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block"></div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-irko-blue outline-none text-sm w-full sm:w-auto"
                    >
                        <option value="apuracao">Período Apuração</option>
                        <option value="transmissao">Data Transmissão</option>
                    </select>

                    <input
                        type="month"
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-irko-blue outline-none text-sm w-full sm:w-auto"
                        value={competencyDate}
                        onChange={(e) => setCompetencyDate(e.target.value)}
                    />

                    {(searchTerm || competencyDate) && (
                        <Button
                            variant="ghost"
                            size="iconSm"
                            onClick={clearFilters}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Limpar Filtros"
                        >
                            <span className="sr-only">Limpar</span>
                            <div className="bg-slate-200 dark:bg-slate-700 rounded-full w-5 h-5 flex items-center justify-center">
                                <span className="text-xs font-bold">×</span>
                            </div>
                        </Button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px]">
                {filteredPerdcomps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <FileText size={32} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p>Nenhuma PERDCOMP encontrada.</p>
                        <Button variant="link" onClick={() => setIsFormOpen(true)} className="mt-2">
                            Criar nova
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">
                                <tr>
                                    <ResizableTh width={getColumnWidth('creditId')} onResize={(w) => handleResize('creditId', w)} className="px-3 py-3 font-semibold">ID Crédito</ResizableTh>
                                    <ResizableTh width={getColumnWidth('numero')} onResize={(w) => handleResize('numero', w)} className="px-3 py-3 font-semibold">Número</ResizableTh>
                                    <ResizableTh width={getColumnWidth('data')} onResize={(w) => handleResize('data', w)} className="px-3 py-3 font-semibold">Data</ResizableTh>
                                    <ResizableTh width={getColumnWidth('empresa')} onResize={(w) => handleResize('empresa', w)} className="px-3 py-3 font-semibold">Empresa</ResizableTh>
                                    <ResizableTh width={getColumnWidth('tipo')} onResize={(w) => handleResize('tipo', w)} className="px-3 py-3 font-semibold">Tipo</ResizableTh>
                                    <ResizableTh width={getColumnWidth('codigo')} onResize={(w) => handleResize('codigo', w)} className="px-3 py-3 font-semibold">Código</ResizableTh>
                                    <ResizableTh width={getColumnWidth('periodo')} onResize={(w) => handleResize('periodo', w)} className="px-3 py-3 font-semibold">Período de Apuração</ResizableTh>
                                    <ResizableTh width={getColumnWidth('vencimento')} onResize={(w) => handleResize('vencimento', w)} className="px-3 py-3 font-semibold">Vencimento</ResizableTh>
                                    <ResizableTh width={getColumnWidth('principal')} onResize={(w) => handleResize('principal', w)} className="px-3 py-3 font-semibold text-right">Principal</ResizableTh>
                                    <ResizableTh width={getColumnWidth('multa')} onResize={(w) => handleResize('multa', w)} className="px-3 py-3 font-semibold text-right">Multa</ResizableTh>
                                    <ResizableTh width={getColumnWidth('juros')} onResize={(w) => handleResize('juros', w)} className="px-3 py-3 font-semibold text-right">Juros</ResizableTh>
                                    <ResizableTh width={getColumnWidth('total')} onResize={(w) => handleResize('total', w)} className="px-3 py-3 font-semibold text-right">Total</ResizableTh>
                                    <ResizableTh width={getColumnWidth('modified_by')} onResize={(w) => handleResize('modified_by', w)} className="px-3 py-3 font-semibold">Modificado por:</ResizableTh>
                                    <ResizableTh width={getColumnWidth('actions')} onResize={(w) => handleResize('actions', w)} className="px-3 py-3 font-semibold text-center">Ações</ResizableTh>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredPerdcomps.map((item) => {
                                    const credit = getCreditInfo(item.creditId);
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-3 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">
                                                #{credit.id ? credit.id.toString().slice(-4) : '---'}
                                            </td>
                                            <td className="px-3 py-3 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    {item.numero}
                                                    {item.isRestituicao && (
                                                        <span className="text-[8px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-1 py-0.5 rounded font-bold uppercase w-fit">
                                                            Restituição
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-slate-600 dark:text-slate-300 text-[10px] whitespace-nowrap">
                                                {new Date(item.dataCriacao).toLocaleDateString()}
                                            </td>
                                            <td className="px-3 py-3 font-medium text-xs text-slate-800 dark:text-white whitespace-nowrap max-w-[150px] truncate" title={credit.empresa}>
                                                {credit.empresa}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                                                {credit.tipoCredito || '-'}
                                            </td>
                                            <td className="px-3 py-3 text-slate-600 dark:text-slate-300 text-[10px] whitespace-nowrap">
                                                {item.codigoImposto || '-'}
                                            </td>
                                            <td className="px-3 py-3 text-slate-600 dark:text-slate-300 text-[10px] whitespace-nowrap">
                                                {item.periodoApuracao || '-'}
                                            </td>
                                            <td className="px-3 py-3 text-slate-600 dark:text-slate-300 text-[10px] whitespace-nowrap">
                                                {item.vencimento ? new Date(item.vencimento).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-3 py-3 text-right text-[10px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                {formatCurrency(item.valorPrincipal)}
                                            </td>
                                            <td className="px-3 py-3 text-right text-[10px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                {formatCurrency(item.multa)}
                                            </td>
                                            <td className="px-3 py-3 text-right text-[10px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                {formatCurrency(item.juros)}
                                            </td>
                                            <td className="px-3 py-3 text-right font-medium text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                {formatCurrency(item.valorCompensado)}
                                            </td>
                                            <td className="px-3 py-3 text-slate-600 dark:text-slate-300 text-[10px] whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{item.modified_by || 'N/A'}</span>
                                                    {item.modified_at && (
                                                        <span className="text-[8px] text-slate-400 dark:text-slate-500">
                                                            {new Date(item.modified_at).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="iconSm"
                                                        onClick={() => handleEdit(item)}
                                                        className="text-slate-500 hover:text-blue-600"
                                                    >
                                                        <Pencil size={14} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="iconSm"
                                                        onClick={() => handleDelete(item.id)}
                                                        className="text-slate-500 hover:text-red-500"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isFormOpen && (
                <PerdcompForm
                    onClose={closeForm}
                    initialData={editingItem}
                />
            )}
            {isUploadOpen && (
                <UploadPerdcompModal
                    onClose={() => setIsUploadOpen(false)}
                    onSuccess={() => {
                        refreshPerdcomps();
                        refreshCredits();
                    }}
                />
            )}
        </div>
    );
}


