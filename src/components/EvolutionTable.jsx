import React, { useMemo, useState } from 'react';
import { format, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateEvolution } from '../utils/calculationEngine';
import { useSelic } from '../hooks/useSelic';
import { formatCurrency, formatPercentage, parseCurrency } from '../utils/formatters';
import { useColumnResize } from '../hooks/useColumnResize';
import ResizableTh from './ui/ResizableTh';
import { Download, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCredits } from '../context/CreditsContext';
import { usePerdcomp } from '../context/PerdcompContext';

import { exportToExcel } from '../utils/exportUtils';

export default function EvolutionTable({ credit }) {
    const { rates } = useSelic();
    // const { updateCredit } = useCredits(); // Removed manual update for now
    const { perdcomps } = usePerdcomp();
    const { columnWidths, handleResize, getColumnWidth } = useColumnResize({
        mes: 100,
        saldo_rem: 120,
        atualizacao: 120,
        perc_mes: 80,
        perc_acum: 80,
        valor_atualizado: 120,
        v_orig_comp: 120,
        atualiz_comp: 120,
        saldo_final: 120
    });
    const [currentPage, setCurrentPage] = useState(1);
    const ROWS_PER_PAGE = 20;

    // Derived compensations from PERDCOMPs
    const effectiveCredit = useMemo(() => {
        try {
            // Filter PERDCOMPs for this credit
            const creditPerdcomps = perdcomps.filter(p => p.creditId === credit.id);

            // Group by month
            const monthlyCompensations = [];

            creditPerdcomps.forEach(p => {
                if (!p.dataCriacao) return;

                // Date of compensation effect is usually the transmission date
                const date = p.dataCriacao;
                const value = parseFloat(p.valorCompensado) || 0;

                try {
                    const parsedDate = parseISO(date);
                    // Check valid date
                    if (isNaN(parsedDate.getTime())) return;

                    // Check if we already have an entry for this month
                    const existingIndex = monthlyCompensations.findIndex(c => isSameMonth(parseISO(c.date), parsedDate));

                    if (existingIndex >= 0) {
                        monthlyCompensations[existingIndex].value += value;
                    } else {
                        monthlyCompensations.push({ date, value });
                    }
                } catch (e) {
                    console.warn("Invalid date in PERDCOMP:", p);
                }
            });

            // Return a new credit-like object with these compensations
            return {
                ...credit,
                compensations: monthlyCompensations
            };
        } catch (err) {
            console.error("Error processing credit compensations:", err);
            return credit;
        }

    }, [credit, perdcomps]);

    const rows = useMemo(() => {
        try {
            return calculateEvolution(effectiveCredit, rates);
        } catch (e) {
            console.error("Calculation error:", e);
            return [];
        }
    }, [effectiveCredit, rates]);

    const handleExport = () => {
        if (!rows || rows.length === 0) return;

        // Simplify data for export
        const dataToExport = rows.map(r => ({
            "Mês/Ano": r.monthLabel,
            "Saldo Original Remanescente": r.principalBase,
            "Atualização": r.monthlyUpdateValue,
            "% Mês": r.monthlyRate / 100,
            "% Acumulado": r.accumulatedRate / 100,
            "Valor Atualizado": r.valorAtualizado,
            "Valor Orig. Comp.": r.compensationPrincipal,
            "Atualiz. Comp.": r.compensationUpdate,
            "Saldo Final": r.saldoFinal
        }));

        exportToExcel(dataToExport, `Evolucao_Credito_${credit.empresa}_${credit.codigoReceita}.xlsx`);
    };

    // Pagination Logic
    const totalPages = Math.ceil((rows || []).length / ROWS_PER_PAGE);

    const paginatedRows = useMemo(() => {
        if (!rows) return [];
        const start = (currentPage - 1) * ROWS_PER_PAGE;
        return rows.slice(start, start + ROWS_PER_PAGE);
    }, [rows, currentPage]);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Disabled manual change
    /* const handleCompensationChange = (date, value) => { ... } */

    if (!rates || rates.length === 0) return <div className="p-4 text-center text-slate-500">Carregando taxas Selic...</div>;

    // Check if we have rows. If not, maybe date is invalid or calculation failed.
    if (!rows || rows.length === 0) {
        return (
            <div className="p-4 text-center text-red-500 bg-red-50 rounded-lg">
                Erro ao calcular evolução. Verifique a data de arrecadação ({credit.dataArrecadacao}) ou tente novamente.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Evolução do Crédito</h3>
                    {credit.tipoCredito && (
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                            {credit.tipoCredito}
                        </span>
                    )}
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 px-3 py-1.5 rounded-lg transition-colors"
                >
                    <Download size={16} />
                    Exportar Excel
                </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <ResizableTh width={getColumnWidth('mes')} onResize={(w) => handleResize('mes', w)} className="px-3 py-2 min-w-[100px]">Mês/Ano</ResizableTh>
                                <ResizableTh width={getColumnWidth('saldo_rem')} onResize={(w) => handleResize('saldo_rem', w)} className="px-3 py-2 text-right">Saldo Orig. Rem.</ResizableTh>
                                <ResizableTh width={getColumnWidth('atualizacao')} onResize={(w) => handleResize('atualizacao', w)} className="px-3 py-2 text-right">Atualização</ResizableTh>
                                <ResizableTh width={getColumnWidth('perc_mes')} onResize={(w) => handleResize('perc_mes', w)} className="px-3 py-2 text-right">% Mês</ResizableTh>
                                <ResizableTh width={getColumnWidth('perc_acum')} onResize={(w) => handleResize('perc_acum', w)} className="px-3 py-2 text-right">% Acum.</ResizableTh>
                                <ResizableTh width={getColumnWidth('valor_atualizado')} onResize={(w) => handleResize('valor_atualizado', w)} className="px-3 py-2 text-right">Valor Atualizado</ResizableTh>
                                <ResizableTh width={getColumnWidth('v_orig_comp')} onResize={(w) => handleResize('v_orig_comp', w)} className="px-3 py-2 text-right w-28">V. Orig. Comp.</ResizableTh>
                                <ResizableTh width={getColumnWidth('atualiz_comp')} onResize={(w) => handleResize('atualiz_comp', w)} className="px-3 py-2 text-right w-28">Atualiz. Comp.</ResizableTh>
                                <ResizableTh width={getColumnWidth('saldo_final')} onResize={(w) => handleResize('saldo_final', w)} className="px-3 py-2 text-right">Saldo Final</ResizableTh>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {paginatedRows.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300 capitalize">
                                        {format(row.date, 'MMM/yyyy', { locale: ptBR })}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                                        {formatCurrency(row.principalBase)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                                        {formatCurrency(row.monthlyUpdateValue)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">
                                        {row.monthlyRate.toFixed(2)}%
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">
                                        {row.accumulatedRate.toFixed(2)}%
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium text-blue-600 dark:text-blue-400">
                                        {formatCurrency(row.valorAtualizado)}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <span className={`font-medium ${row.compensationPrincipal > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-300'}`}>
                                            {row.compensationPrincipal > 0 ? formatCurrency(row.compensationPrincipal) : '-'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <span className={`font-medium ${row.compensationUpdate > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-300'}`}>
                                            {row.compensationUpdate > 0 ? formatCurrency(row.compensationUpdate) : '-'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-500">
                                        {formatCurrency(row.saldoFinal)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {rows.length > ROWS_PER_PAGE && (
                    <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Mostrando {((currentPage - 1) * ROWS_PER_PAGE) + 1} a {Math.min(currentPage * ROWS_PER_PAGE, rows.length)} de {rows.length} registros
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="flex items-center text-xs font-medium text-slate-600 dark:text-slate-300 px-2">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
