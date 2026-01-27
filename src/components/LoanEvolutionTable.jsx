import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { calculateLoanEvolution } from '../utils/loanCalculator';
import { formatCurrencyByCode, formatCurrency } from '../utils/formatters';
import { useColumnResize } from '../hooks/useColumnResize';
import ResizableTh from './ui/ResizableTh';
import { TrendingUp, TrendingDown, Minus, ChevronRight, ChevronDown, Download } from 'lucide-react';
import { exportToExcel } from '../utils/exportUtils';
import { useCompanies } from '../context/CompanyContext';

export default function LoanEvolutionTable({ loan }) {
    const [expandedMonths, setExpandedMonths] = useState({});
    const { companies } = useCompanies();
    const { columnWidths, handleResize, getColumnWidth } = useColumnResize({
        mes: 100,
        indice: 120,
        tx: 80,
        correcao: 120,
        juros_am: 100,
        juros_acum: 120,
        saldo_org: 150,
        saldo_brl: 150,
        var_princ: 120,
        var_juros: 120,
        total: 120
    });

    const range = useMemo(() => {
        const start = format(new Date(loan.dataInicio), 'dd/MM/yyyy');
        const end = format(new Date(), 'dd/MM/yyyy');
        return { start, end };
    }, [loan.dataInicio]);

    const { rates, loading, error } = useExchangeRates(loan.moeda, range.start, range.end);

    const evolution = useMemo(() => {
        if (loading || error) return [];
        return calculateLoanEvolution(loan, rates);
    }, [loan, rates, loading, error]);

    const toggleMonth = (month) => {
        setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
    };

    const handleExportToExcel = async () => {
        const allLogs = evolution.flatMap(month => month.dailyLogs);

        const data = allLogs.map(log => ({
            'Data': log.date,
            [`Principal (${loan.moeda})`]: log.principalOrg,
            [`Juros (${loan.moeda})`]: log.dailyInterest,
            [`Juros Acum. (${loan.moeda})`]: log.interestOrgAcc,
            'Câmbio': log.rate,
            'Var. Cambial Princ. (BRL)': log.activeVarPrincipal - log.passiveVarPrincipal,
            'Var. Cambial Juros (BRL)': log.activeVarInterest - log.passiveVarInterest,
            'Principal (BRL)': log.principalBrl,
            'Juros (BRL)': log.dailyInterestBrl,
            'Juros Acum. (BRL)': log.interestBrl,
            'Total (BRL)': log.totalBrl
        }));

        // Calculate final balance
        const lastLog = allLogs[allLogs.length - 1];
        const finalBalance = lastLog ? lastLog.totalBrl : 0;

        const metadata = {
            title: `DEMONSTRATIVO DE EVOLUÇÃO - ${loan.instituicao.toUpperCase()}`,
            headerInfo: [
                { label: 'Empresa:', value: companies.find(c => c.id === loan.empresaId)?.name || 'N/A' },
                { label: 'Instituição:', value: loan.instituicao },
                { label: 'Contrato:', value: loan.numeroContrato || 'S/N' },
                { label: 'Moeda:', value: loan.moeda },
                { label: 'Valor Original:', value: formatCurrencyByCode(loan.valorOriginal, loan.moeda) },
                { label: 'Data Início:', value: new Date(loan.dataInicio).toLocaleDateString('pt-BR') },
                { label: 'Taxa Juros:', value: `${loan.taxa}% ${loan.periodoTaxa} (${loan.tipoJuros})` },
                { label: 'Saldo Atual:', value: formatCurrency(finalBalance) }
            ]
        };

        await exportToExcel(data, `Demonstrativo_${loan.instituicao}_${loan.numeroContrato || 'SN'}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`, metadata);
    };

    if (loading) return (
        <div className="flex items-center justify-center p-8 gap-3 text-slate-500">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Carregando taxas de câmbio históricas...
        </div>
    );

    if (error) return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm">
            Erro ao carregar taxas: {error}
        </div>
    );

    return (
        <div className="space-y-2">
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        Demonstrativo de Evolução
                    </h4>
                    <button
                        onClick={handleExportToExcel}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-emerald-500/20"
                    >
                        <Download size={14} />
                        Exportar Excel
                    </button>
                </div>

                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <tr>
                            <th className="px-3 py-3 font-bold border-b dark:border-slate-700 w-8"></th>
                            <ResizableTh width={getColumnWidth('mes')} onResize={(w) => handleResize('mes', w)} className="px-3 py-3 font-bold border-b dark:border-slate-700">Data</ResizableTh>
                            <ResizableTh width={getColumnWidth('indice')} onResize={(w) => handleResize('indice', w)} className="px-3 py-3 font-bold border-b dark:border-slate-700">Câmbio</ResizableTh>
                            <ResizableTh width={getColumnWidth('saldo_org')} onResize={(w) => handleResize('saldo_org', w)} className="px-3 py-3 font-bold border-b dark:border-slate-700 text-right">Principal ({loan.moeda})</ResizableTh>
                            <ResizableTh width={getColumnWidth('juros_am')} onResize={(w) => handleResize('juros_am', w)} className="px-3 py-3 font-bold border-b dark:border-slate-700 text-right">Juros ({loan.moeda})</ResizableTh>
                            <ResizableTh width={getColumnWidth('juros_acum')} onResize={(w) => handleResize('juros_acum', w)} className="px-3 py-3 font-bold border-b dark:border-slate-700 text-right">Juros Acum. ({loan.moeda})</ResizableTh>
                            <ResizableTh width={getColumnWidth('var_princ')} onResize={(w) => handleResize('var_princ', w)} className="px-3 py-3 font-bold border-b dark:border-slate-700 text-right">Variação Cambial Principal</ResizableTh>
                            <ResizableTh width={getColumnWidth('var_juros')} onResize={(w) => handleResize('var_juros', w)} className="px-3 py-3 font-bold border-b dark:border-slate-700 text-right">Variação Cambial Juros</ResizableTh>
                            <ResizableTh width={getColumnWidth('saldo_brl')} onResize={(w) => handleResize('saldo_brl', w)} className="px-3 py-3 font-bold border-b dark:border-slate-700 text-right">Principal (Real)</ResizableTh>
                            <ResizableTh width={getColumnWidth('juros_am')} onResize={(w) => handleResize('juros_am', w)} className="px-3 py-3 font-bold border-b dark:border-slate-700 text-right">Juros (Real)</ResizableTh>
                            <ResizableTh width={getColumnWidth('juros_acum')} onResize={(w) => handleResize('juros_acum', w)} className="px-3 py-3 font-bold border-b dark:border-slate-700 text-right">Juros Acum. (Real)</ResizableTh>
                            <ResizableTh width={getColumnWidth('total')} onResize={(w) => handleResize('total', w)} className="px-3 py-3 font-bold border-b dark:border-slate-700 text-right">Total (Real)</ResizableTh>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {evolution.map((row, index) => {
                            const isExpanded = expandedMonths[row.monthLabel];
                            const totalVariation = row.variationPrincipal + row.variationInterest;

                            return (
                                <React.Fragment key={index}>
                                    <tr
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors cursor-pointer group"
                                        onClick={() => toggleMonth(row.monthLabel)}
                                    >
                                        <td className="px-4 py-3">
                                            {isExpanded ? <ChevronDown size={14} className="text-blue-500" /> : <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                                            {row.monthLabel}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                            {row.exchangeRate.toFixed(4)}
                                        </td>
                                        <td className="px-3 py-3 text-right font-bold text-slate-700 dark:text-slate-300">
                                            {formatCurrencyByCode(row.finalPrincipalOrg, loan.moeda)}
                                        </td>
                                        <td className="px-3 py-3 text-right text-emerald-500">
                                            +{formatCurrencyByCode(row.monthlyInterestOrg, loan.moeda)}
                                        </td>
                                        <td className="px-3 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                                            {formatCurrencyByCode(row.finalInterestOrg, loan.moeda)}
                                        </td>
                                        <td className={`px-3 py-3 text-right font-medium ${row.activeVarPrincipal - row.passiveVarPrincipal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {(row.activeVarPrincipal - row.passiveVarPrincipal >= 0 ? '+' : '') + formatCurrencyByCode(row.activeVarPrincipal - row.passiveVarPrincipal, 'BRL')}
                                        </td>
                                        <td className={`px-3 py-3 text-right font-medium ${row.activeVarInterest - row.passiveVarInterest >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {(row.activeVarInterest - row.passiveVarInterest >= 0 ? '+' : '') + formatCurrencyByCode(row.activeVarInterest - row.passiveVarInterest, 'BRL')}
                                        </td>
                                        <td className="px-3 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                                            {formatCurrencyByCode(row.principalBrl, 'BRL')}
                                        </td>
                                        <td className="px-3 py-3 text-right text-emerald-500">
                                            {formatCurrencyByCode(row.monthlyInterestBrl, 'BRL')}
                                        </td>
                                        <td className="px-3 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                                            {formatCurrencyByCode(row.interestBrl, 'BRL')}
                                        </td>
                                        <td className="px-3 py-3 text-right font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800/50">
                                            {formatCurrencyByCode(row.totalBrl, 'BRL')}
                                        </td>
                                    </tr>

                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={14} className="px-4 py-4 bg-slate-50/30 dark:bg-slate-900/40">
                                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                                                    <table className="w-full text-[10px] text-left">
                                                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase tracking-tighter">
                                                            <tr>
                                                                <th className="px-3 py-2 min-w-[80px]">Data</th>
                                                                <th className="px-3 py-2 min-w-[80px]">Câmbio</th>
                                                                <th className="px-3 py-2 text-right min-w-[100px]">Principal ({loan.moeda})</th>
                                                                <th className="px-3 py-2 text-right min-w-[100px]">Juros ({loan.moeda})</th>
                                                                <th className="px-3 py-2 text-right min-w-[100px]">Juros Acum. ({loan.moeda})</th>
                                                                <th className="px-3 py-2 text-right min-w-[100px]">Variação Cambial Princ</th>
                                                                <th className="px-3 py-2 text-right min-w-[100px]">Variação Cambial Juros</th>
                                                                <th className="px-3 py-2 text-right min-w-[100px]">Principal (Real)</th>
                                                                <th className="px-3 py-2 text-right min-w-[100px]">Juros (Real)</th>
                                                                <th className="px-3 py-2 text-right min-w-[100px]">Juros Acum (Real)</th>
                                                                <th className="px-3 py-2 text-right min-w-[100px]">Total (Real)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                            {row.dailyLogs.map((log, lIdx) => (
                                                                <tr key={lIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                                    <td className="px-3 py-2 font-medium">{log.date}</td>
                                                                    <td className="px-3 py-2 text-slate-400">{log.rate.toFixed(4)}</td>
                                                                    <td className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">
                                                                        {formatCurrencyByCode(log.principalOrg, loan.moeda)}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right text-emerald-500">
                                                                        +{formatCurrencyByCode(log.dailyInterest, loan.moeda)}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">
                                                                        {formatCurrencyByCode(log.interestOrgAcc, loan.moeda)}
                                                                    </td>
                                                                    <td className={`px-3 py-2 text-right font-medium ${log.activeVarPrincipal - log.passiveVarPrincipal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                        {(log.activeVarPrincipal - log.passiveVarPrincipal >= 0 ? '+' : '') + formatCurrencyByCode(log.activeVarPrincipal - log.passiveVarPrincipal, 'BRL')}
                                                                    </td>
                                                                    <td className={`px-3 py-2 text-right font-medium ${log.activeVarInterest - log.passiveVarInterest >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                        {(log.activeVarInterest - log.passiveVarInterest >= 0 ? '+' : '') + formatCurrencyByCode(log.activeVarInterest - log.passiveVarInterest, 'BRL')}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">
                                                                        {formatCurrencyByCode(log.principalBrl, 'BRL')}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right text-emerald-500">
                                                                        {formatCurrencyByCode(log.dailyInterestBrl, 'BRL')}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">
                                                                        {formatCurrencyByCode(log.interestBrl, 'BRL')}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right font-bold text-slate-700 dark:text-slate-300">
                                                                        {formatCurrencyByCode(log.totalBrl, 'BRL')}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
                {evolution.length === 0 && !loading && (
                    <div className="p-8 text-center text-slate-400 italic">
                        Dados insuficientes para demonstrar a evolução.
                    </div>
                )}
            </div>
        </div>
    );
}
