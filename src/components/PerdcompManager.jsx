import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Pencil, Trash2, FileText, AlertCircle, CheckCircle, Clock, Download } from 'lucide-react';
import PerdcompForm from './PerdcompForm';
import { usePerdcomp } from '../context/PerdcompContext';
import { useCredits } from '../context/CreditsContext';
import { formatCurrency } from '../utils/formatters';
import { exportToExcel } from '../utils/exportUtils';

export default function PerdcompManager() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { perdcomps, removePerdcomp } = usePerdcomp();
    const { credits } = useCredits();

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

    const getCreditInfo = (creditId) => {
        return credits.find(c => c.id == creditId) || { empresa: 'Desconhecido', codigoReceita: '---', tipoCredito: '---' };
    };

    // Filter Logic
    const filteredPerdcomps = useMemo(() => {
        if (!searchTerm) return perdcomps;
        const lowerTerm = searchTerm.toLowerCase();
        return perdcomps.filter(item => {
            const credit = getCreditInfo(item.creditId);
            return (
                item.numero.toLowerCase().includes(lowerTerm) ||
                credit.empresa.toLowerCase().includes(lowerTerm) ||
                credit.codigoReceita.toLowerCase().includes(lowerTerm)
            );
        });
    }, [perdcomps, searchTerm, credits]);

    const handleExport = () => {
        if (filteredPerdcomps.length === 0) return;

        const dataToExport = filteredPerdcomps.map(item => {
            const credit = getCreditInfo(item.creditId);
            return {
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
                "Total Compensado": item.valorCompensado
            };
        });

        exportToExcel(dataToExport, `Relatorio_PERDCOMPs_${new Date().toISOString().split('T')[0]}.xlsx`);
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
                    <button
                        onClick={handleExport}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Download size={20} />
                        Exportar Excel
                    </button>
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        Nova PERDCOMP
                    </button>
                </div>
            </div>

            {/* Filters / Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Pesquisar por Número, Empresa..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px]">
                {filteredPerdcomps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <FileText size={32} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p>Nenhuma PERDCOMP encontrada.</p>
                        <button onClick={() => setIsFormOpen(true)} className="text-blue-600 hover:underline mt-2">
                            Criar nova
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-3 py-3 font-semibold">Número</th>
                                    <th className="px-3 py-3 font-semibold">Data</th>
                                    <th className="px-3 py-3 font-semibold">Empresa</th>
                                    <th className="px-3 py-3 font-semibold">Tipo</th>
                                    <th className="px-3 py-3 font-semibold">Código</th>
                                    <th className="px-3 py-3 font-semibold">Período</th>
                                    <th className="px-3 py-3 font-semibold">Vencimento</th>
                                    <th className="px-3 py-3 font-semibold text-right">Principal</th>
                                    <th className="px-3 py-3 font-semibold text-right">Multa</th>
                                    <th className="px-3 py-3 font-semibold text-right">Juros</th>
                                    <th className="px-3 py-3 font-semibold text-right">Total</th>
                                    <th className="px-3 py-3 font-semibold text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredPerdcomps.map((item) => {
                                    const credit = getCreditInfo(item.creditId);
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-3 py-3 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                {item.numero}
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
                                            <td className="px-3 py-3 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
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
        </div>
    );
}
