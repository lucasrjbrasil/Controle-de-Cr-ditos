import React, { useState, useMemo, useEffect } from 'react';
import { Search, History, Plus, Pencil, Trash2, X, Check, Globe, Settings, Trash, Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { bcbService, COMMON_CODES } from '../services/bcbService';
import { useColumnResize } from '../hooks/useColumnResize';
import ResizableTh from './ui/ResizableTh';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';

export default function ExchangeRateManager() {
    const [managedCurrencies, setManagedCurrencies] = useState({});
    const { columnWidths, handleResize, getColumnWidth } = useColumnResize({
        data: 150,
        buy: 150,
        sell: 150,
        status: 120,
        actions: 100
    });
    const [currency, setCurrency] = useState('USD');
    const { rates, updateRate, removeRate, loading, error, batchUpdateRates } = useExchangeRates(currency);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingDate, setEditingDate] = useState(null);
    const [editValue, setEditValue] = useState({ buy: '', sell: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Load managed currencies on mount
    useEffect(() => {
        async function load() {
            const currencies = await bcbService.getManagedCurrencies();
            setManagedCurrencies(currencies);
            const keys = Object.keys(currencies);
            if (keys.length > 0 && !currencies[currency]) {
                setCurrency(keys[0]);
            }
        }
        load();
    }, [currency]);

    const filteredRates = useMemo(() => {
        if (!rates || !Array.isArray(rates)) return [];

        try {
            const parseToDateValue = (dateStr) => {
                if (!dateStr) return 0;
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const [day, month, year] = parts;
                    return parseInt(year) * 10000 + parseInt(month) * 100 + parseInt(day);
                }
                return 0;
            };

            const sorted = [...rates].sort((a, b) => {
                return parseToDateValue(b.data) - parseToDateValue(a.data);
            });

            return sorted.filter(r =>
                (r?.data && r.data.includes(searchTerm)) ||
                (r?.valor?.buy && r.valor.buy.toString().includes(searchTerm)) ||
                (r?.valor?.sell && r.valor.sell.toString().includes(searchTerm))
            );
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

    // Reset to page 1 when search or currency changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, currency]);

    const startEditing = (rate) => {
        setEditingDate(rate.data);
        setEditValue({
            buy: rate.valor?.buy || '',
            sell: rate.valor?.sell || ''
        });
    };

    const cancelEditing = () => {
        setEditingDate(null);
        setEditValue({ buy: '', sell: '' });
    };

    const saveEditing = () => {
        if (editingDate && (editValue.buy || editValue.sell)) {
            updateRate(editingDate, editValue);
            setEditingDate(null);
            setEditValue({ buy: '', sell: '' });
        }
    };

    const handleDelete = (date) => {
        if (window.confirm(`Tem certeza que deseja excluir a taxa de ${date}?`)) {
            try {
                removeRate(date);
            } catch (error) {
                alert('Erro ao excluir: ' + error.message);
            }
        }
    };

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newRateData, setNewRateData] = useState({ date: '', buy: '', sell: '', source: 'MANUAL' });

    const [isBatchOpen, setIsBatchOpen] = useState(false);
    const [batchRange, setBatchRange] = useState({ start: '', end: '' });
    const [isImporting, setIsImporting] = useState(false);

    // Unified Manager State
    const [isCurrencyManagerOpen, setIsCurrencyManagerOpen] = useState(false);
    const [managerSearch, setManagerSearch] = useState('');
    const [showManualAdd, setShowManualAdd] = useState(false);
    const [newCurrency, setNewCurrency] = useState({ symbol: '', buySeriesId: '', sellSeriesId: '' });

    // Lookup / Catalog State
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [verifyId, setVerifyId] = useState('');
    const [verifyResult, setVerifyResult] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const filteredCatalog = useMemo(() => {
        const lower = catalogSearch.toLowerCase();
        return COMMON_CODES.filter(c =>
            c.name.toLowerCase().includes(lower) ||
            c.symbol.toLowerCase().includes(lower)
        );
    }, [catalogSearch]);

    const filteredManagerList = useMemo(() => {
        const lower = managerSearch.toLowerCase();
        // Merge common codes with any custom managed codes that might not be in the list
        const commonSymbols = new Set(COMMON_CODES.map(c => c.symbol));
        const customCodes = Object.entries(managedCurrencies)
            .filter(([sym]) => !commonSymbols.has(sym))
            .map(([sym, ids]) => ({
                name: `Personalizado (${sym})`,
                symbol: sym,
                buy: ids.buy,
                sell: ids.sell
            }));

        const allCodes = [...COMMON_CODES, ...customCodes];

        return allCodes.filter(c =>
            c.name.toLowerCase().includes(lower) ||
            c.symbol.toLowerCase().includes(lower)
        );
    }, [managerSearch, managedCurrencies]);

    const handleSelectCurrency = async (codeItem) => {
        // If not managed, add it first
        if (!managedCurrencies[codeItem.symbol]) {
            await bcbService.addManagedCurrency(codeItem.symbol, codeItem.buy, codeItem.sell);
            const updated = await bcbService.getManagedCurrencies();
            setManagedCurrencies(updated);
        }
        setCurrency(codeItem.symbol);
        setIsCurrencyManagerOpen(false);
    };

    const handleRemoveManaged = async (e, symbol) => {
        e.stopPropagation(); // Prevent selection when clicking remove
        if (window.confirm(`Remover ${symbol} da lista de moedas gerenciadas?`)) {
            await bcbService.removeManagedCurrency(symbol);
            const updated = await bcbService.getManagedCurrencies();
            setManagedCurrencies(updated);
            // If current currency was removed, switch to another
            if (currency === symbol) {
                setCurrency(Object.keys(updated)[0] || 'USD');
            }
        }
    };

    const handleVerify = async () => {
        if (!verifyId) return;
        setIsVerifying(true);
        setVerifyResult(null);
        try {
            const data = await bcbService.verifySeries(verifyId);
            setVerifyResult({ success: true, data });
        } catch (error) {
            setVerifyResult({ success: false, error: "Erro ao buscar. Verifique o código." });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleAddRate = (e) => {
        e.preventDefault();
        if (newRateData.date && (newRateData.buy || newRateData.sell)) {
            try {
                updateRate(newRateData.date, { buy: newRateData.buy, sell: newRateData.sell }, newRateData.source);
                setIsAddOpen(false);
                setNewRateData({ date: '', buy: '', sell: '', source: 'MANUAL' });
            } catch (err) {
                alert("Erro ao adicionar taxa: " + err.message);
            }
        } else {
            alert("Preencha a data e pelo menos uma das taxas");
        }
    };

    const handleBatchImport = async (e) => {
        e.preventDefault();
        if (!batchRange.start || !batchRange.end) {
            alert("Preencha o intervalo (Início e Fim)");
            return;
        }

        try {
            setIsImporting(true);
            const fetchedRates = await bcbService.fetchExchangeRatesForRange(batchRange.start, batchRange.end, currency);

            if (fetchedRates && fetchedRates.length > 0) {
                // Transform to the format expected by batchUpdateRates: {date, value: {buy, sell}, source}
                const transformedRates = fetchedRates.map(r => ({
                    date: r.date || r.data,
                    value: r.valor || r.value,
                    source: r.source || 'BCB'
                }));

                batchUpdateRates(transformedRates);
                const first = fetchedRates[0].date || fetchedRates[0].data;
                const last = fetchedRates[fetchedRates.length - 1].date || fetchedRates[fetchedRates.length - 1].data;

                const hasMissing = transformedRates.some(r => !r.value?.buy || !r.value?.sell);
                let msg = `Importação concluída! ${fetchedRates.length} taxas importadas.\nDe: ${first} Até: ${last}`;
                if (hasMissing) {
                    msg += "\n\nNota: Algumas datas podem estar com taxas parciais (apenas compra ou apenas venda).";
                }
                alert(msg);
            } else {
                alert("Nenhuma taxa encontrada para o período informado.");
            }

            setIsBatchOpen(false);
            setBatchRange({ start: '', end: '' });
        } catch (error) {
            console.error("Batch import error:", error);
            alert("Erro na importação: " + error.message);
        } finally {
            setIsImporting(false);
        }
    };

    const handleAddManualCurrency = async (e) => {
        e.preventDefault();
        if (newCurrency.symbol && newCurrency.buySeriesId && newCurrency.sellSeriesId) {
            await bcbService.addManagedCurrency(newCurrency.symbol.toUpperCase(), newCurrency.buySeriesId, newCurrency.sellSeriesId);
            const updated = await bcbService.getManagedCurrencies();
            setManagedCurrencies(updated);
            setCurrency(newCurrency.symbol.toUpperCase());
            setNewCurrency({ symbol: '', buySeriesId: '', sellSeriesId: '' });
            setShowManualAdd(false);
            setIsCurrencyManagerOpen(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Globe className="text-blue-600" />
                        Taxas Cambiais
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        Gerencie taxas PTAX diárias de compra e venda.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => setIsCurrencyManagerOpen(true)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 min-w-[100px]"
                        title="Trocar Moeda"
                    >
                        <span className="font-bold flex items-center justify-between w-full gap-2">
                            {currency}
                            <ChevronDown size={16} className="text-slate-400" />
                        </span>
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setIsBatchOpen(true)}
                        className="flex items-center gap-2"
                    >
                        <Calendar size={18} />
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
                    <Button
                        variant="ghost"
                        onClick={async () => {
                            if (window.confirm(`Isso apagará TODAS as taxas salvas de ${currency} e limpará o cache de histórico. Recomendado para corrigir taxas incorretas.`)) {
                                await bcbService.clearHistoryCache(currency);
                                await bcbService.clearAllOverrides(currency);
                                window.location.reload();
                            }
                        }}
                        className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/20"
                        title="Limpar Taxas Salvas"
                    >
                        <Trash size={18} />
                    </Button>
                    <div className="relative w-full md:w-48">
                        <Input
                            icon={Search}
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Unified Currency Manager Modal */}
            <Modal
                isOpen={isCurrencyManagerOpen}
                onClose={() => setIsCurrencyManagerOpen(false)}
                title={
                    <span className="flex items-center gap-2">
                        <Globe size={20} className="text-blue-600" />
                        Selecionar Moeda
                    </span>
                }
                maxWidth="2xl"
            >
                <div>
                    <div className="mb-4 flex-shrink-0">
                        <div className="relative">
                            <Input
                                icon={Search}
                                placeholder="Buscar moeda (ex: Peso, Euro, JPY)..."
                                value={managerSearch}
                                onChange={(e) => setManagerSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-lg mb-4 max-h-[400px]">
                        {filteredManagerList.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">Nenhuma moeda encontrada com esse nome.</div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredManagerList.map(c => {
                                    const isManaged = !!managedCurrencies[c.symbol];
                                    const isSelected = c.symbol === currency;
                                    return (
                                        <div
                                            key={c.symbol}
                                            onClick={() => handleSelectCurrency(c)}
                                            className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${isSelected
                                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                }`}
                                        >
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-white'}`}>{c.name}</span>
                                                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">{c.symbol}</span>
                                                    {isManaged && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">Salva</span>}
                                                </div>
                                                <span className="text-xs text-slate-400">Compra: {c.buy} | Venda: {c.sell}</span>
                                            </div>

                                            {isManaged ? (
                                                <button
                                                    onClick={(e) => handleRemoveManaged(e, c.symbol)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                    title="Remover da lista"
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            ) : (
                                                <button className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200">
                                                    Selecionar
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800 pt-3">
                        <button
                            onClick={() => setShowManualAdd(!showManualAdd)}
                            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors mb-3 w-full justify-center"
                        >
                            {showManualAdd ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {showManualAdd ? 'Ocultar adição manual' : 'Não encontrou? Adicionar manualmente'}
                        </button>

                        {showManualAdd && (
                            <form onSubmit={handleAddManualCurrency} className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-2 duration-200">
                                <Input
                                    placeholder="Símbolo"
                                    value={newCurrency.symbol}
                                    onChange={e => setNewCurrency({ ...newCurrency, symbol: e.target.value.toUpperCase() })}
                                    className="text-xs"
                                    required
                                />
                                <Input
                                    type="number"
                                    placeholder="ID Compra"
                                    value={newCurrency.buySeriesId}
                                    onChange={e => setNewCurrency({ ...newCurrency, buySeriesId: e.target.value })}
                                    className="text-xs"
                                    required
                                />
                                <Input
                                    type="number"
                                    placeholder="ID Venda"
                                    value={newCurrency.sellSeriesId}
                                    onChange={e => setNewCurrency({ ...newCurrency, sellSeriesId: e.target.value })}
                                    className="text-xs"
                                    required
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    className="w-full"
                                >
                                    <Plus size={16} />
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                title={`Adicionar Taxa ${currency}`}
                maxWidth="sm"
            >
                <form onSubmit={handleAddRate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Data (DD/MM/AAAA)</label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Input
                                    placeholder="01/01/2026"
                                    value={newRateData.date}
                                    onChange={e => setNewRateData({ ...newRateData, date: e.target.value })}
                                    className="text-sm"
                                    required
                                />
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={async () => {
                                    if (!newRateData.date || newRateData.date.length < 10) {
                                        alert("Digite a data primeiro.");
                                        return;
                                    }
                                    try {
                                        const res = await bcbService.fetchExchangeRateForDate(newRateData.date, currency);
                                        if (res) {
                                            setNewRateData({
                                                ...newRateData,
                                                buy: res.buy || '',
                                                sell: res.sell || '',
                                                source: 'BCB'
                                            });
                                        } else {
                                            alert("Taxa não encontrada no BCB.");
                                        }
                                    } catch (e) {
                                        alert("Erro ao buscar no BCB.");
                                    }
                                }}
                                className="text-xs font-medium whitespace-nowrap"
                            >
                                Buscar BCB
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Compra (R$)</label>
                            <Input
                                type="number"
                                step="0.0001"
                                value={newRateData.buy}
                                onChange={e => setNewRateData({ ...newRateData, buy: e.target.value })}
                                className="text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Venda (R$)</label>
                            <Input
                                type="number"
                                step="0.0001"
                                value={newRateData.sell}
                                onChange={e => setNewRateData({ ...newRateData, sell: e.target.value })}
                                className="text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)} className="text-sm">Cancelar</Button>
                        <Button type="submit" className="font-medium text-sm">Salvar</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isBatchOpen}
                onClose={() => setIsBatchOpen(false)}
                title={`Importar Intervalo ${currency} (BCB)`}
                maxWidth="sm"
            >
                <form onSubmit={handleBatchImport} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Início (DD/MM/AAAA)</label>
                            <Input
                                placeholder="01/01/2024"
                                value={batchRange.start}
                                onChange={e => setBatchRange({ ...batchRange, start: e.target.value })}
                                className="text-sm"
                                required
                                disabled={isImporting}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Fim (DD/MM/AAAA)</label>
                            <Input
                                placeholder="31/01/2024"
                                value={batchRange.end}
                                onChange={e => setBatchRange({ ...batchRange, end: e.target.value })}
                                className="text-sm"
                                required
                                disabled={isImporting}
                            />
                        </div>
                    </div>

                    {isImporting && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium text-slate-500">
                                <span>Importando dados (duas séries)...</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div className="bg-blue-600 h-full transition-all duration-300 w-1/2 animate-pulse" />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button type="button" variant="secondary" onClick={() => setIsBatchOpen(false)} className="text-sm" disabled={isImporting}>Cancelar</Button>
                        <Button type="submit" className="font-medium text-sm" disabled={isImporting}>
                            {isImporting ? 'Buscando...' : 'Iniciar Importação'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Catalog & Verification Modal */}
            <Modal
                isOpen={isCatalogOpen}
                onClose={() => setIsCatalogOpen(false)}
                title={
                    <span className="flex items-center gap-2">
                        <Globe className="text-blue-600" />
                        Catálogo de Séries BCB
                    </span>
                }
                maxWidth="4xl"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-hidden h-full">
                    {/* Left: Reference Table */}
                    <div className="flex flex-col h-full overflow-hidden">
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                            <Search size={16} />
                            Moedas Comuns
                        </h4>
                        <div className="mb-3">
                            <Input
                                placeholder="Filtrar por nome ou símbolo (ex: Euro, AUD)..."
                                value={catalogSearch}
                                onChange={(e) => setCatalogSearch(e.target.value)}
                                className="text-sm"
                                autoFocus
                            />
                        </div>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden flex-1 overflow-y-auto max-h-[400px]">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800 font-medium text-slate-500 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2">Moeda</th>
                                        <th className="px-3 py-2">Símbolo</th>
                                        <th className="px-3 py-2">Compra</th>
                                        <th className="px-3 py-2">Venda</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredCatalog.map(c => (
                                        <tr key={c.symbol} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <td className="px-3 py-2 font-medium">{c.name}</td>
                                            <td className="px-3 py-2 font-mono text-xs bg-slate-100 dark:bg-slate-800 rounded px-1">{c.symbol}</td>
                                            <td className="px-3 py-2 font-mono text-blue-600">{c.buy}</td>
                                            <td className="px-3 py-2 font-mono text-emerald-600">{c.sell}</td>
                                        </tr>
                                    ))}
                                    {filteredCatalog.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-3 py-8 text-center text-slate-500">Nenhuma moeda encontrada.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right: Verifier */}
                    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800">
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-2">Verificador de Código</h4>
                        <p className="text-xs text-slate-500 mb-4">
                            Teste um código do BCB (SGS) para ver os dados reais antes de cadastrar.
                        </p>

                        <div className="flex gap-2 mb-4">
                            <Input
                                type="number"
                                placeholder="Ex: 21619"
                                value={verifyId}
                                onChange={(e) => setVerifyId(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                                wrapperClassName="flex-1"
                            />
                            <Button
                                onClick={handleVerify}
                                disabled={isVerifying || !verifyId}
                                className="font-medium"
                            >
                                {isVerifying ? '...' : 'Verificar'}
                            </Button>
                        </div>

                        <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                            {verifyResult ? (
                                verifyResult.success ? (
                                    <div className="flex flex-col h-full">
                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                            Dados Encontrados (Últimos 5 dias)
                                        </div>
                                        <div className="overflow-y-auto flex-1 p-0">
                                            <table className="w-full text-sm">
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {verifyResult.data.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td className="px-4 py-2 text-slate-500 font-mono text-xs">{item.date}</td>
                                                            <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200 text-right">{item.value}</td>
                                                        </tr>
                                                    ))}
                                                    {verifyResult.data.length === 0 && (
                                                        <tr>
                                                            <td className="p-8 text-center text-slate-400 text-xs">Sem dados recentes para este código.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-red-500 p-4 text-center gap-2">
                                        <X size={32} />
                                        <p className="font-medium">{verifyResult.error}</p>
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center gap-2">
                                    <Search size={32} className="opacity-20" />
                                    <p className="text-xs">Digite um código e clique em verificar.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm h-[600px] flex flex-col">
                <div className="overflow-y-auto flex-1 text-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <ResizableTh width={getColumnWidth('data')} onResize={(w) => handleResize('data', w)} className="px-6 py-4">Data</ResizableTh>
                                <ResizableTh width={getColumnWidth('buy')} onResize={(w) => handleResize('buy', w)} className="px-6 py-4">Compra (R$)</ResizableTh>
                                <ResizableTh width={getColumnWidth('sell')} onResize={(w) => handleResize('sell', w)} className="px-6 py-4">Venda (R$)</ResizableTh>
                                <ResizableTh width={getColumnWidth('status')} onResize={(w) => handleResize('status', w)} className="px-6 py-4 text-center">Status</ResizableTh>
                                <ResizableTh width={getColumnWidth('actions')} onResize={(w) => handleResize('actions', w)} className="px-6 py-4 text-right">Ações</ResizableTh>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Carregando taxas...</td></tr>
                            ) : paginatedRates.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Nenhuma taxa encontrada.</td></tr>
                            ) : (
                                paginatedRates.map((rate, index) => {
                                    const isEditing = editingDate === rate.data;
                                    return (
                                        <tr key={rate.data || index} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${rate.isOverridden ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                                            <td className="px-6 py-3 font-mono text-slate-600 dark:text-slate-300">{rate.data}</td>
                                            <td className="px-6 py-3">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        step="0.0001"
                                                        value={editValue.buy}
                                                        onChange={(e) => setEditValue({ ...editValue, buy: e.target.value })}
                                                        className="bg-white dark:bg-slate-800 border border-blue-300 rounded px-2 py-1 w-24 text-slate-800 dark:text-white"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                                        {rate.valor?.buy ? parseFloat(rate.valor.buy).toFixed(4) : '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        step="0.0001"
                                                        value={editValue.sell}
                                                        onChange={(e) => setEditValue({ ...editValue, sell: e.target.value })}
                                                        className="bg-white dark:bg-slate-800 border border-blue-300 rounded px-2 py-1 w-24 text-slate-800 dark:text-white"
                                                    />
                                                ) : (
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                                        {rate.valor?.sell ? parseFloat(rate.valor.sell).toFixed(4) : '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${rate.isOverridden || rate.source === 'BCB'
                                                    ? (rate.source === 'BCB' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400')
                                                    : 'text-slate-400'
                                                    }`}>
                                                    {rate.isOverridden || rate.source === 'BCB' ? (rate.source === 'BCB' ? 'BCB' : 'Manual') : 'Oficial'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {isEditing ? (
                                                        <>
                                                            <Button onClick={saveEditing} variant="ghost" size="iconSm" className="text-emerald-600 hover:bg-emerald-50"><Check size={18} /></Button>
                                                            <Button onClick={cancelEditing} variant="ghost" size="iconSm" className="text-slate-400 hover:bg-slate-100"><X size={18} /></Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button onClick={() => startEditing(rate)} variant="ghost" size="iconSm" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Pencil size={16} /></Button>
                                                            {rate.isOverridden && (
                                                                <Button onClick={() => handleDelete(rate.data)} variant="ghost" size="iconSm" className="text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={16} /></Button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
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
