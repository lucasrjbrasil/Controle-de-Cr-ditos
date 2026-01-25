import React, { useState, useMemo, useEffect } from 'react';
import { Search, History, Plus, Pencil, Trash2, X, Check, Globe, Settings, Trash, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { bcbService, COMMON_CODES } from '../services/bcbService';
import { useColumnResize } from '../hooks/useColumnResize';
import ResizableTh from './ui/ResizableTh';

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

    // Load managed currencies on mount
    useEffect(() => {
        const currencies = bcbService.getManagedCurrencies();
        setManagedCurrencies(currencies);
        const keys = Object.keys(currencies);
        if (keys.length > 0 && !currencies[currency]) {
            setCurrency(keys[0]);
        }
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

    const handleSelectCurrency = (codeItem) => {
        // If not managed, add it first
        if (!managedCurrencies[codeItem.symbol]) {
            bcbService.addManagedCurrency(codeItem.symbol, codeItem.buy, codeItem.sell);
            const updated = bcbService.getManagedCurrencies();
            setManagedCurrencies(updated);
        }
        setCurrency(codeItem.symbol);
        setIsCurrencyManagerOpen(false);
    };

    const handleRemoveManaged = (e, symbol) => {
        e.stopPropagation(); // Prevent selection when clicking remove
        if (window.confirm(`Remover ${symbol} da lista de moedas gerenciadas?`)) {
            bcbService.removeManagedCurrency(symbol);
            const updated = bcbService.getManagedCurrencies();
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
                batchUpdateRates(fetchedRates);
                const first = fetchedRates[0].date;
                const last = fetchedRates[fetchedRates.length - 1].date;
                alert(`Importação concluída! ${fetchedRates.length} taxas importadas.\nDe: ${first} Até: ${last}`);
            } else {
                alert("Nenhuma taxa encontrada para o período informado.");
            }

            setIsBatchOpen(false);
            setBatchRange({ start: '', end: '' });
        } catch (error) {
            alert("Erro na importação: " + error.message);
        } finally {
            setIsImporting(false);
        }
    };

    const handleAddManualCurrency = (e) => {
        e.preventDefault();
        if (newCurrency.symbol && newCurrency.buySeriesId && newCurrency.sellSeriesId) {
            bcbService.addManagedCurrency(newCurrency.symbol.toUpperCase(), newCurrency.buySeriesId, newCurrency.sellSeriesId);
            const updated = bcbService.getManagedCurrencies();
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
                        Taxas Cambiais (Compra/Venda)
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        Gerencie taxas PTAX diárias de compra e venda do BCB.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsCurrencyManagerOpen(true)}
                        className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-800 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                        title="Trocar Moeda"
                    >
                        <span className="font-bold flex items-center gap-2">
                            {currency}
                            <ChevronDown size={16} className="text-slate-400" />
                        </span>
                    </button>

                    <button
                        onClick={() => {
                            if (window.confirm(`Isso apagará TODAS as taxas salvas de ${currency} e limpará o cache de histórico. Recomendado para corrigir taxas incorretas.`)) {
                                bcbService.clearHistoryCache(currency);
                                localStorage.removeItem(`exchange_${currency}_overrides`);
                                window.location.reload();
                            }
                        }}
                        className="p-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-all border border-red-200 dark:border-red-800"
                        title="Limpar Taxas Salvas"
                    >
                        <Trash size={20} />
                    </button>

                    <button
                        onClick={() => setIsBatchOpen(true)}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-medium text-sm border border-slate-200 dark:border-slate-700"
                    >
                        <Calendar size={18} />
                        Importar Período
                    </button>


                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg shadow-blue-500/20 font-medium text-sm"
                    >
                        <Plus size={18} />
                        Adicionar
                    </button>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 w-full md:w-48 text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Unified Currency Manager Modal */}
            {isCurrencyManagerOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200 flex flex-col h-[80vh]">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Globe size={20} className="text-blue-600" />
                                Selecionar Moeda
                            </h3>
                            <button onClick={() => setIsCurrencyManagerOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-4 flex-shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar moeda (ex: Peso, Euro, JPY)..."
                                    value={managerSearch}
                                    onChange={(e) => setManagerSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-lg mb-4">
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
                                    <input
                                        type="text"
                                        placeholder="Símbolo"
                                        value={newCurrency.symbol}
                                        onChange={e => setNewCurrency({ ...newCurrency, symbol: e.target.value.toUpperCase() })}
                                        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder="ID Compra"
                                        value={newCurrency.buySeriesId}
                                        onChange={e => setNewCurrency({ ...newCurrency, buySeriesId: e.target.value })}
                                        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder="ID Venda"
                                        value={newCurrency.sellSeriesId}
                                        onChange={e => setNewCurrency({ ...newCurrency, sellSeriesId: e.target.value })}
                                        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                        required
                                    />
                                    <button type="submit" className="bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center">
                                        <Plus size={16} />
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isAddOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Adicionar Taxa {currency}</h3>
                        <form onSubmit={handleAddRate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Data (DD/MM/AAAA)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="01/01/2026"
                                        value={newRateData.date}
                                        onChange={e => setNewRateData({ ...newRateData, date: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                                        required
                                    />
                                    <button
                                        type="button"
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
                                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-xs font-medium"
                                    >
                                        Buscar BCB
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Compra (R$)</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        value={newRateData.buy}
                                        onChange={e => setNewRateData({ ...newRateData, buy: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Venda (R$)</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        value={newRateData.sell}
                                        onChange={e => setNewRateData({ ...newRateData, sell: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isBatchOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Importar Período {currency} (BCB)</h3>
                        <form onSubmit={handleBatchImport} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Início (DD/MM/AAAA)</label>
                                    <input
                                        type="text"
                                        placeholder="01/01/2024"
                                        value={batchRange.start}
                                        onChange={e => setBatchRange({ ...batchRange, start: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                                        required
                                        disabled={isImporting}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Fim (DD/MM/AAAA)</label>
                                    <input
                                        type="text"
                                        placeholder="31/01/2024"
                                        value={batchRange.end}
                                        onChange={e => setBatchRange({ ...batchRange, end: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
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
                                <button type="button" onClick={() => setIsBatchOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm" disabled={isImporting}>Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm" disabled={isImporting}>
                                    {isImporting ? 'Buscando...' : 'Iniciar Importação'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Catalog & Verification Modal */}
            {isCatalogOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-4xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Globe className="text-blue-600" />
                                Catálogo de Séries BCB
                            </h3>
                            <button onClick={() => setIsCatalogOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-hidden h-full">
                            {/* Left: Reference Table */}
                            <div className="flex flex-col h-full overflow-hidden">
                                <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                                    <Search size={16} />
                                    Moedas Comuns
                                </h4>
                                <input
                                    type="text"
                                    placeholder="Filtrar por nome ou símbolo (ex: Euro, AUD)..."
                                    value={catalogSearch}
                                    onChange={(e) => setCatalogSearch(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm mb-3"
                                    autoFocus
                                />
                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden flex-1 overflow-y-auto">
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
                                    <input
                                        type="number"
                                        placeholder="Ex: 21619"
                                        value={verifyId}
                                        onChange={(e) => setVerifyId(e.target.value)}
                                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm"
                                        onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                                    />
                                    <button
                                        onClick={handleVerify}
                                        disabled={isVerifying || !verifyId}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isVerifying ? '...' : 'Verificar'}
                                    </button>
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
                    </div>
                </div>
            )}

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
                            ) : filteredRates.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Nenhuma taxa encontrada.</td></tr>
                            ) : (
                                filteredRates.map((rate, index) => {
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
                                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${rate.isOverridden
                                                    ? (rate.source === 'BCB' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700')
                                                    : 'text-slate-400'
                                                    }`}>
                                                    {rate.isOverridden ? (rate.source === 'BCB' ? 'BCB' : 'Manual') : 'Oficial'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {isEditing ? (
                                                        <>
                                                            <button onClick={saveEditing} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check size={18} /></button>
                                                            <button onClick={cancelEditing} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => startEditing(rate)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={16} /></button>
                                                            {rate.isOverridden && (
                                                                <button onClick={() => handleDelete(rate.data)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
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
            </div>
        </div>
    );
}
