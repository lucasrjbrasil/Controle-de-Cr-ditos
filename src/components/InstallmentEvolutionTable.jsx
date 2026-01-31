import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateInstallmentEvolution } from '../utils/calculationEngine';
import { useSelic } from '../hooks/useSelic';
import { formatCurrency, formatCNPJ } from '../utils/formatters';
import { useColumnResize } from '../hooks/useColumnResize';
import ResizableTh from './ui/ResizableTh';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './ui/Button';
import { exportToExcel } from '../utils/exportUtils';
import { useCompanies } from '../context/CompanyContext';

export default function InstallmentEvolutionTable({ installment }) {
    const { rates } = useSelic();
    const { companies } = useCompanies();
    const { columnWidths, handleResize, getColumnWidth } = useColumnResize({
        numero: 60,
        vencimento: 100,
        principal_comp: 110,
        multa_comp: 100,
        juros_comp: 100,
        selic_novo: 110,
        total: 120,
        saldo: 120
    });

    const [currentPage, setCurrentPage] = useState(1);
    const ROWS_PER_PAGE = 12;

    const rows = useMemo(() => {
        try {
            return calculateInstallmentEvolution(installment, rates);
        } catch (e) {
            console.error("Calculation error:", e);
            return [];
        }
    }, [installment, rates]);

    const handleExport = () => {
        if (!rows || rows.length === 0) return;

        const dataToExport = rows.map(r => ({
            "Parcela": r.number,
            "Vencimento": format(r.date, 'dd/MM/yyyy'),
            "Principal (Amort)": r.amortizedPrincipal,
            "Multa (Amort)": r.amortizedFine,
            "Juros Consolidados (Amort)": r.amortizedInterest,
            "Juros Selic (Novo)": r.selicUpdateAmount,
            "Taxa Selic Total (%)": r.accumulatedRate,
            "Valor Total": r.totalAmount,
            "Saldo Devedor": r.balance
        }));

        const company = companies.find(c => c.id === installment.empresaId);

        exportToExcel(dataToExport, `Evolucao_Parcelamento_${installment.numeroProcesso}.xlsx`, {
            title: 'EVOLUÇÃO DO PARCELAMENTO - DETALHADA',
            empresa: company ? company.name : 'N/A',
            cnpj: company ? formatCNPJ(company.cnpj) : 'N/A',
            processo: installment.numeroProcesso,
            modalidade: installment.categoria,
            consolidacao: format(new Date(installment.dataInicio), 'dd/MM/yyyy'),
            valorOriginal: formatCurrency(installment.valorOriginal)
        });
    };

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

    if (!rates || rates.length === 0) return <div className="p-4 text-center text-slate-500">Carregando taxas Selic...</div>;

    if (!rows || rows.length === 0) {
        return (
            <div className="p-4 text-center text-red-500 bg-red-50 rounded-lg">
                Não foi possível calcular a evolução. Verifique os dados do parcelamento.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Planilha de Evolução</h3>
                    <span className="text-sm text-slate-500">
                        {rows.length} parcelas simuladas
                    </span>
                </div>
                <Button variant="success" size="sm" onClick={handleExport} className="gap-2">
                    <Download size={16} />
                    Exportar Detalhado
                </Button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <ResizableTh width={getColumnWidth('numero')} onResize={(w) => handleResize('numero', w)} className="px-3 py-2 text-center">Parcela</ResizableTh>
                                <ResizableTh width={getColumnWidth('vencimento')} onResize={(w) => handleResize('vencimento', w)} className="px-3 py-2">Vencimento</ResizableTh>
                                <ResizableTh width={getColumnWidth('principal_comp')} onResize={(w) => handleResize('principal_comp', w)} className="px-3 py-2 text-right bg-blue-50/50 dark:bg-blue-900/10">Principal (Amort)</ResizableTh>
                                <ResizableTh width={getColumnWidth('multa_comp')} onResize={(w) => handleResize('multa_comp', w)} className="px-3 py-2 text-right bg-red-50/50 dark:bg-red-900/10">Multa (Amort)</ResizableTh>
                                <ResizableTh width={getColumnWidth('juros_comp')} onResize={(w) => handleResize('juros_comp', w)} className="px-3 py-2 text-right bg-orange-50/50 dark:bg-orange-900/10">Juros (Amort)</ResizableTh>
                                <ResizableTh width={getColumnWidth('selic_novo')} onResize={(w) => handleResize('selic_novo', w)} className="px-3 py-2 text-right text-purple-600">Juros Selic (Novo)</ResizableTh>
                                <ResizableTh width={getColumnWidth('total')} onResize={(w) => handleResize('total', w)} className="px-3 py-2 text-right font-bold">Total Parcela</ResizableTh>
                                <ResizableTh width={getColumnWidth('saldo')} onResize={(w) => handleResize('saldo', w)} className="px-3 py-2 text-right">Saldo Devedor</ResizableTh>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {paginatedRows.map((row) => (
                                <tr key={row.number} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300 font-medium">
                                        {row.number}
                                    </td>
                                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300 capitalize">
                                        {format(row.date, 'MMM/yyyy', { locale: ptBR })}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300 bg-blue-50/30 dark:bg-blue-900/5">
                                        {formatCurrency(row.amortizedPrincipal)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300 bg-red-50/30 dark:bg-red-900/5">
                                        {formatCurrency(row.amortizedFine)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300 bg-orange-50/30 dark:bg-orange-900/5">
                                        {formatCurrency(row.amortizedInterest)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-purple-600 dark:text-purple-400 font-medium">
                                        {formatCurrency(row.selicUpdateAmount)}
                                        <span className="block text-[9px] text-purple-400">({row.accumulatedRate.toFixed(2)}%)</span>
                                    </td>
                                    <td className="px-3 py-2 text-right font-bold text-slate-800 dark:text-white">
                                        {formatCurrency(row.totalAmount)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-500 font-mono">
                                        {formatCurrency(row.balance)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {rows.length > ROWS_PER_PAGE && (
                    <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Página {currentPage} de {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
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
