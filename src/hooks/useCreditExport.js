import { useState } from 'react';
import { parseISO, isSameMonth, isAfter, endOfMonth } from 'date-fns';
import { formatCNPJ } from '../utils/formatters';
import { calculateEvolution } from '../utils/calculationEngine';
import { exportToExcel } from '../utils/exportUtils';

export function useCreditExport(credits, perdcomps, companies, rates) {
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportOptions, setExportOptions] = useState({
        company: '',
        competency: ''
    });

    const openExportModal = (initialCompetency) => {
        setExportOptions({
            company: '',
            competency: initialCompetency || new Date().toISOString().slice(0, 7)
        });
        setIsExportModalOpen(true);
    };

    const confirmExport = async (getBalanceAtCompetency) => {
        const targetCredits = credits.filter(c => {
            if (exportOptions.company && c.empresa !== exportOptions.company) return false;
            return true;
        });

        if (targetCredits.length === 0) {
            alert("Nenhum crédito encontrado para os filtros selecionados.");
            return;
        }

        const sheets = [];

        try {
            // Create individual evolution sheets for each credit
            for (const credit of targetCredits) {
                try {
                    // Calculate evolution using the same engine as EvolutionTable
                    const creditPerdcomps = perdcomps.filter(p => p.creditId === credit.id);
                    const monthlyCompensations = [];

                    creditPerdcomps.forEach(p => {
                        if (!p.dataCriacao) return;
                        const date = p.dataCriacao;
                        const value = parseFloat(p.valorCompensado) || 0;

                        try {
                            const parsedDate = parseISO(date);
                            if (isNaN(parsedDate.getTime())) return;

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

                    const effectiveCredit = {
                        ...credit,
                        compensations: monthlyCompensations
                    };

                    const evolution = calculateEvolution(effectiveCredit, rates);

                    if (evolution && evolution.length > 0) {
                        // Filter evolution up to the export competency
                        const competencyDate = parseISO(exportOptions.competency + '-01');
                        const filteredEvolution = evolution.filter(row => {
                            return !isAfter(row.date, endOfMonth(competencyDate));
                        });

                        const sheetData = filteredEvolution.map(row => ({
                            "Mês/Ano": row.monthLabel,
                            "Saldo Original Remanescente": row.principalBase,
                            "Atualização": row.monthlyUpdateOnly,
                            "Selic Acumulada": row.monthlyUpdateValue,
                            "% Mês": row.monthlyRate / 100,
                            "% Acumulado": row.accumulatedRate / 100,
                            "Valor Atualizado": row.valorAtualizado,
                            "Valor Orig. Comp.": row.compensationPrincipal,
                            "Atualiz. Comp.": row.compensationUpdate,
                            "Saldo Final": row.saldoFinal
                        }));

                        const company = companies.find(c => c.name === credit.empresa);
                        const cnpj = company ? formatCNPJ(company.cnpj) : 'N/A';
                        const pedidoRestituicao = perdcomps.find(p => p.creditId === credit.id && p.isRestituicao)?.numero || 'N/A';

                        sheets.push({
                            name: `Cred ${credit.id}`.substring(0, 30),
                            data: sheetData,
                            metadata: {
                                title: 'EVOLUÇÃO DO CRÉDITO',
                                empresa: credit.empresa,
                                cnpj: cnpj,
                                codigoInterno: credit.id || 'N/A',
                                pedidoRestituicao: pedidoRestituicao,
                                dataArrecadacao: credit.dataArrecadacao ? new Date(credit.dataArrecadacao).toLocaleDateString() : 'N/A',
                                tipoCredito: credit.tipoCredito || 'N/A'
                            }
                        });
                    }
                } catch (err) {
                    console.error(`Error processing credit ${credit.id} for export`, err);
                }
            }

            // Create summary sheet
            const summaryData = targetCredits.map(credit => {
                const balanceInfo = getBalanceAtCompetency(credit, exportOptions.competency);
                const userDisplay = credit.modified_by
                    ? `${credit.modified_by} (${new Date(credit.modified_at).toLocaleDateString()})`
                    : '';

                return {
                    "ID": credit.id.toString(),
                    "Empresa": credit.empresa,
                    "Tipo de Crédito": credit.tipoCredito,
                    "Código Receita": credit.codigoReceita,
                    "Período Apuração": credit.periodoApuracao,
                    "Pedido Restituição": perdcomps.find(p => p.creditId === credit.id && p.isRestituicao)?.numero || '',
                    "Valor Principal": credit.valorPrincipal,
                    "Data Arrecadação": new Date(credit.dataArrecadacao).toLocaleDateString(),
                    [`Saldo em ${exportOptions.competency.split('-').reverse().join('/')}`]: balanceInfo.value,
                    "Modificado por": userDisplay
                };
            });

            const companyName = exportOptions.company ? exportOptions.company.replace(/[^a-zA-Z0-9]/g, '_') : 'Todas';
            await exportToExcel(summaryData, `Relatorio_Creditos_${companyName}_${exportOptions.competency}.xlsx`, {
                title: 'RESUMO DE CRÉDITOS TRIBUTÁRIOS',
                headerInfo: [
                    { label: 'Empresa:', value: exportOptions.company || 'Todas' },
                    { label: 'Competência:', value: exportOptions.competency },
                    { label: 'Data Geração:', value: new Date().toLocaleDateString() }
                ]
            }, sheets);
            setIsExportModalOpen(false);
        } catch (error) {
            console.error("Error exporting credits:", error);
            alert("Erro ao exportar créditos. Verifique o console para mais detalhes.");
        }
    };

    return {
        isExportModalOpen,
        setIsExportModalOpen,
        exportOptions,
        setExportOptions,
        openExportModal,
        confirmExport
    };
}
