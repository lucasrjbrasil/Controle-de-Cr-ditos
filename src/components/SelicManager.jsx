import React, { useState, useMemo } from 'react';
import { Search, Save, History, RotateCcw, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useSelic } from '../hooks/useSelic';

export default function SelicManager() {
    const { rates, updateRate, removeRate, loading, error } = useSelic();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingDate, setEditingDate] = useState(null);
    const [editValue, setEditValue] = useState('');

    const filteredRates = useMemo(() => {
        if (!rates || !Array.isArray(rates)) return [];

        try {
            // Helper to parse MM/YYYY to a sortable number (YYYYMM)
            const parseToDateValue = (dateStr) => {
                if (!dateStr) return 0;
                const [month, year] = dateStr.split('/');
                return parseInt(year) * 100 + parseInt(month);
            };

            // 1. Sort by date descending
            const sorted = [...rates].sort((a, b) => {
                return parseToDateValue(b.data) - parseToDateValue(a.data);
            });

            // 2. Filter based on search term
            return sorted.filter(r =>
                (r?.data && r.data.includes(searchTerm)) ||
                (r?.valor && r.valor.toString().includes(searchTerm))
            );
        } catch (err) {
            console.error("Error filtering rates:", err);
            return [];
        }
    }, [rates, searchTerm]);

    const startEditing = (rate) => {
        setEditingDate(rate.data);
        setEditValue(rate.valor);
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
        if (window.confirm(`Tem certeza que deseja excluir/restaurar a taxa de ${date}?`)) {
            try {
                removeRate(date);
                // Note: useSelic triggers reload currently, so no need for extensive local state cleanup
            } catch (error) {
                alert('Erro ao excluir: ' + error.message);
            }
        }
    };

    // ... (rest of modals and imports)

    // In render return... replace table body mapping:
    /*
                            {filteredRates.map((rate, index) => {
                                if (!rate || !rate.data) return null;

                                const isEditing = editingDate === rate.data;

                                return (
                                    <tr key={rate.data || index} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${rate.isOverridden ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                                        <td className="px-6 py-3 font-mono text-slate-600 dark:text-slate-300">
                                            {rate.data}
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
                                                    {rate.valor}%
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {rate.isOverridden ? (
                                                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full font-medium">
                                                    Editado
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">Oficial</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            onClick={saveEditing}
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                                            title="Confirmar"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                            title="Cancelar"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => startEditing(rate)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        {rate.isOverridden && (
                                                            <button
                                                                onClick={() => handleDelete(rate.data)}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                title="Restaurar/Excluir"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
    */

    // Add Modal State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newRateData, setNewRateData] = useState({ date: '', value: '', source: 'MANUAL' });

    const handleAddRate = (e) => {
        e.preventDefault();
        console.log("Attempting to add rate:", newRateData);
        if (newRateData.date && newRateData.value) {
            try {
                // Ensure format MM/YYYY
                updateRate(newRateData.date, newRateData.value, newRateData.source);
                console.log("Rate updated");
                setIsAddOpen(false);
                setNewRateData({ date: '', value: '', source: 'MANUAL' });
            } catch (err) {
                console.error("Error adding rate:", err);
                alert("Erro ao adicionar taxa: " + err.message);
            }
        } else {
            alert("Preencha todos os campos");
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
                        Visualize e ajuste as taxas mensais (MM/AAAA).
                    </p>
                </div>

                {/* Search */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg shadow-blue-500/20 transition-all font-medium text-sm"
                    >
                        <Plus size={18} />
                        Adicionar
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar mês/ano..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none w-full md:w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Add Rate Modal */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Adicionar Taxa Selic</h3>
                        <form onSubmit={handleAddRate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Mês/Ano (MM/AAAA)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="01/2026"
                                        value={newRateData.date}
                                        onChange={e => setNewRateData({ ...newRateData, date: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!newRateData.date || newRateData.date.length < 7) {
                                                alert("Digite o Mês/Ano (MM/AAAA) primeiro.");
                                                return;
                                            }
                                            const [m, y] = newRateData.date.split('/');
                                            if (!m || !y) return;

                                            try {
                                                const { bcbService } = await import('../services/bcbService');
                                                // Disable button state?
                                                const val = await bcbService.fetchRateForMonth(m, y);
                                                if (val) {
                                                    setNewRateData({ ...newRateData, value: val, source: 'BCB' });
                                                } else {
                                                    alert("Taxa não encontrada no BCB para este período.");
                                                }
                                            } catch (e) {
                                                alert("Erro ao buscar no BCB.");
                                            }
                                        }}
                                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-medium whitespace-nowrap"
                                    >
                                        Buscar BCB
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Taxa (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.90"
                                    value={newRateData.value}
                                    onChange={e => setNewRateData({ ...newRateData, value: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsAddOpen(false)}
                                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm h-[600px] flex flex-col">
                <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4">Data (Mês/Ano)</th>
                                <th className="px-6 py-4">Taxa (%)</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredRates.map((rate, index) => {
                                if (!rate || !rate.data) return null;

                                const isEditing = editingDate === rate.data;

                                return (
                                    <tr key={rate.data || index} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${rate.isOverridden ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                                        <td className="px-6 py-3 font-mono text-slate-600 dark:text-slate-300">
                                            {rate.data}
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
                                                    {rate.valor}%
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {rate.isOverridden ? (
                                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${rate.source === 'BCB'
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                    }`}>
                                                    {rate.source === 'BCB' ? 'Automático BCB' : 'Editado Manual'}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">Oficial</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            onClick={saveEditing}
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                                            title="Confirmar"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                            title="Cancelar"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => startEditing(rate)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        {rate.isOverridden && (
                                                            <button
                                                                onClick={() => handleDelete(rate.data)}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                title="Restaurar/Excluir"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
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
            </div>
        </div>
    );
}
