import { useState } from 'react';
import { format, parseISO, endOfMonth } from 'date-fns';
import { formatCurrency, formatCurrencyByCode } from '../utils/formatters';
import { calculateLoanEvolution } from '../utils/loanCalculator';
import { bcbService } from '../services/bcbService';
import { exportToExcel } from '../utils/exportUtils';

export function useLoanExport(loans, companies) {
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportOptions, setExportOptions] = useState({ company: '', competency: '' });
    const [loadingRates, setLoadingRates] = useState(false);

    const openExportModal = (initialCompetency) => {
        setExportOptions({
            company: '',
            competency: initialCompetency
        });
        setIsExportModalOpen(true);
    };

    const confirmExport = async () => {
        const targetLoans = loans.filter(l => {
            const companyName = companies.find(c => c.id === l.empresaId)?.name || '';
            if (exportOptions.company && companyName !== exportOptions.company) return false;
            return true;
        });

        if (targetLoans.length === 0) {
            alert("Nenhum empréstimo encontrado.");
            return;
        }

        const sheets = [];

        setLoadingRates(true);
        try {
            const exportSnapshots = {};

            for (const loan of targetLoans) {
                try {
                    const compDate = parseISO(exportOptions.competency + '-01');
                    const start = format(parseISO(loan.dataInicio), 'dd/MM/yyyy');
                    const end = format(endOfMonth(compDate), 'dd/MM/yyyy');

                    let rates = [];
                    if (loan.moeda !== 'BRL') {
                        rates = await bcbService.fetchExchangeRatesForRange(start, end, loan.moeda);
                    }

                    const evolution = calculateLoanEvolution(loan, rates, endOfMonth(compDate));

                    // Extract snapshot for the summary sheet
                    const lastMonth = evolution[evolution.length - 1];
                    const lastLog = lastMonth?.dailyLogs[lastMonth.dailyLogs.length - 1];

                    exportSnapshots[loan.id] = {
                        balanceOrg: (lastLog?.principalOrg || 0) + (lastLog?.interestOrgAcc || 0),
                        balanceBrl: lastLog?.totalBrl || 0,
                        isLiquidated: ((lastLog?.principalOrg || 0) + (lastLog?.interestOrgAcc || 0)) <= 0.01
                    };

                    const sheetData = evolution.flatMap(month => month.dailyLogs).map(log => ({
                        'Data': log.date,
                        [`Principal (${loan.moeda})`]: log.principalOrg,
                        [`Juros (${loan.moeda})`]: log.dailyInterest,
                        [`Juros Acum. (${loan.moeda})`]: log.interestOrgAcc,
                        'Câmbio': log.rate,
                        'Var. Cambial Princ. (BRL)': log.variationPrincipal,
                        'Var. Cambial Juros (BRL)': log.variationInterest,
                        'Principal (BRL)': log.principalBrl,
                        'Juros (BRL)': log.dailyInterestBrl,
                        'Juros Acum. (BRL)': log.interestBrl,
                        'Total (BRL)': log.totalBrl
                    }));

                    sheets.push({
                        name: `Ctr ${loan.numeroContrato || loan.id}`.substring(0, 30),
                        data: sheetData,
                        metadata: {
                            title: `DEMONSTRATIVO DE EVOLUÇÃO - ${loan.instituicao.toUpperCase()}`,
                            headerInfo: [
                                { label: 'Empresa:', value: companies.find(c => c.id === loan.empresaId)?.name || 'N/A' },
                                { label: 'Instituição:', value: loan.instituicao },
                                { label: 'Contrato:', value: loan.numeroContrato || 'S/N' },
                                { label: 'Moeda:', value: loan.moeda },
                                { label: 'Valor Original:', value: formatCurrencyByCode(loan.valorOriginal, loan.moeda) },
                                { label: 'Data Início:', value: new Date(loan.dataInicio).toLocaleDateString() },
                                { label: 'Taxa Juros:', value: `${loan.taxa}% ${loan.periodoTaxa} (${loan.tipoJuros})` },
                                { label: `Saldo em ${exportOptions.competency}:`, value: formatCurrency(exportSnapshots[loan.id].balanceBrl) }
                            ]
                        }
                    });

                } catch (err) {
                    console.error(`Error processing loan ${loan.id} for export`, err);
                }
            }

            const summaryData = targetLoans.map(loan => {
                const snapshot = exportSnapshots[loan.id] || { balanceOrg: 0, balanceBrl: 0, isLiquidated: false };
                return {
                    'Empresa': companies.find(c => c.id === loan.empresaId)?.name || 'N/A',
                    'Instituição': loan.instituicao,
                    'Contrato': loan.numeroContrato || 'S/N',
                    'Moeda': loan.moeda,
                    'Valor Original': loan.valorOriginal,
                    'Taxa': `${loan.taxa}% ${loan.periodoTaxa}`,
                    [`Saldo em ${exportOptions.competency} (${loan.moeda})`]: snapshot.balanceOrg,
                    [`Saldo em ${exportOptions.competency} (BRL)`]: snapshot.balanceBrl,
                    'Status': snapshot.isLiquidated ? 'Liquidado' : 'Ativo',
                    'Modificado por': loan.modified_by ? `${loan.modified_by} (${new Date(loan.modified_at).toLocaleDateString()})` : ''
                };
            });

            const companyName = exportOptions.company ? exportOptions.company.replace(/[^a-zA-Z0-9]/g, '_') : 'Todas';
            await exportToExcel(summaryData, `Relatorio_Emprestimos_${companyName}_${exportOptions.competency}.xlsx`, {
                title: 'RESUMO DE EMPRÉSTIMOS E FINANCIAMENTOS',
                headerInfo: [
                    { label: 'Empresa:', value: exportOptions.company || 'Todas' },
                    { label: 'Competência:', value: exportOptions.competency },
                    { label: 'Data Geração:', value: new Date().toLocaleDateString() }
                ]
            }, sheets);
            setIsExportModalOpen(false);
        } catch (error) {
            console.error("Export error:", error);
            alert("Erro ao gerar exportação.");
        } finally {
            setLoadingRates(false);
        }
    };

    return {
        isExportModalOpen,
        setIsExportModalOpen,
        exportOptions,
        setExportOptions,
        loadingRates,
        openExportModal,
        confirmExport
    };
}
