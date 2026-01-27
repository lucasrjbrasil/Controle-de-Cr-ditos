import React, { useState } from 'react';
import { Plus, Search, Filter, Pencil, Trash2, Download } from 'lucide-react';
import { parseISO, isSameMonth, isAfter, endOfMonth } from 'date-fns';
import { exportToExcel } from '../utils/exportUtils';
import CreditForm from './CreditForm';
import { useCredits } from '../context/CreditsContext';
import { usePerdcomp } from '../context/PerdcompContext';
import { useCompanies } from '../context/CompanyContext';
import { formatCurrency, formatCNPJ } from '../utils/formatters';
import EvolutionTable from './EvolutionTable';
import { useSelic } from '../hooks/useSelic';
import { calculateEvolution } from '../utils/calculationEngine';
import ErrorBoundary from './ErrorBoundary';
import { useColumnResize } from '../hooks/useColumnResize';
import ResizableTh from './ui/ResizableTh';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';

export default function CreditsManager() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { columnWidths, handleResize, getColumnWidth } = useColumnResize({
        id: 80,
        empresa: 250,
        periodo: 100,
        codigo: 100,
        tipo: 100,
        valor: 150,
        saldo: 150,
        restituicao: 150,
        modified_by: 180,
        actions: 120
    });
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportOptions, setExportOptions] = useState({
        company: '',
        competency: ''
    });
    const [expandedId, setExpandedId] = useState(null);
    const [editingCredit, setEditingCredit] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [competencyDate, setCompetencyDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
    const { credits, removeCredit } = useCredits();
    const { rates } = useSelic();
    const { perdcomps } = usePerdcomp();
    const { companies } = useCompanies();

    // Helper to get balance
    const getBalanceAtCompetency = (credit, referenceDate = competencyDate) => {
        if (!referenceDate) return { value: 0, isFuture: false };

        try {
            const creditPerdcomps = perdcomps.filter(p => p.creditId === credit.id);
            const monthlyCompensations = [];
            creditPerdcomps.forEach(p => {
                const date = p.dataCriacao;
                const valStr = p.valorCompensado;
                const value = typeof valStr === 'number' ? valStr : Number(valStr.replace(/[^0-9,-]+/g, "").replace(",", "."));

                const existingIndex = monthlyCompensations.findIndex(c => c.date.substring(0, 7) === date.substring(0, 7));
                if (existingIndex >= 0) monthlyCompensations[existingIndex].value += value;
                else monthlyCompensations.push({ date, value });
            });

            const effectiveCredit = { ...credit, compensations: monthlyCompensations };
            const evolution = calculateEvolution(effectiveCredit, rates);

            const [year, month] = referenceDate.split('-');
            const targetLabel = `${month}/${year}`;

            const row = evolution.find(r => r.monthLabel === targetLabel);
            if (row) return { value: row.saldoFinal, isFuture: false };

            const firstRow = evolution[0];
            if (firstRow && referenceDate < firstRow.date.toISOString().slice(0, 7)) {
                return { value: 0, isFuture: true };
            }

            const lastRow = evolution[evolution.length - 1];
            if (lastRow) return { value: lastRow.saldoFinal, isFuture: false };

            return { value: 0, isFuture: false };
        } catch (e) {
            return { value: 0, isFuture: false };
        }
    };

    const toggleDetails = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const handleEdit = (credit) => {
        setEditingCredit(credit);
        setIsFormOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Tem certeza que deseja excluir este crédito?')) {
            removeCredit(id);
        }
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingCredit(null);
    };

    // Derived state for filtering
    const filteredCredits = React.useMemo(() => {
        let filtered = credits;

        // Text Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(credit => {
                // Find the company associated with this credit
                const company = companies.find(c => c.name === credit.empresa);
                const nickname = company?.nickname || '';

                return (
                    credit.empresa.toLowerCase().includes(lowerTerm) ||
                    credit.codigoReceita.toLowerCase().includes(lowerTerm) ||
                    credit.id.toString().includes(lowerTerm) ||
                    nickname.toLowerCase().includes(lowerTerm)
                );
            });
        }

        // Available Balance Filter
        if (showOnlyAvailable) {
            filtered = filtered.filter(credit => {
                const balanceInfo = getBalanceAtCompetency(credit);
                return balanceInfo.value > 0;
            });
        }

        return filtered;
    }, [credits, searchTerm, showOnlyAvailable, competencyDate, perdcomps, rates]);

    const handleExportClick = () => {
        setExportOptions({
            company: '',
            competency: competencyDate || new Date().toISOString().slice(0, 7)
        });
        setIsExportModalOpen(true);
    };

    const confirmExport = async () => {
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

    const totalBalance = filteredCredits.reduce((acc, credit) => {
        return acc + getBalanceAtCompetency(credit).value;
    }, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Saldo dos Créditos</h2>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie e monitore a evolução dos seus créditos tributários.</p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="success"
                        onClick={handleExportClick}
                        disabled={credits.length === 0}
                        className="gap-2"
                    >
                        <Download size={20} />
                        Exportar Excel
                    </Button>
                    <Button
                        onClick={() => setIsFormOpen(true)}
                        className="gap-2"
                    >
                        <Plus size={20} />
                        Novo Crédito
                    </Button>
                </div>
            </div>

            {/* Total Balance Card */}
            <div className="bg-gradient-to-br from-irko-blue via-[#004a8d] to-irko-orange/80 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="text-blue-100/80 text-sm font-medium mb-1">Saldo Total Disponível ({competencyDate.split('-').reverse().join('/')})</p>
                        <h3 className="text-4xl font-bold">{formatCurrency(totalBalance)}</h3>
                    </div>
                    <div className="text-right">
                        <p className="text-white/60 text-xs">Considerando {filteredCredits.length} créditos filtrados</p>
                    </div>
                </div>
            </div>

            {/* Filters / Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Input
                        icon={Search}
                        placeholder="Pesquisar por Empresa, Código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={showOnlyAvailable}
                                onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                            />
                            <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-irko-orange rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-irko-orange"></div>
                        </div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap group-hover:text-irko-blue transition-colors">
                            Somente com Saldo
                        </span>
                    </label>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block"></div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            Competência:
                        </label>
                        <input
                            type="month"
                            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-irko-blue outline-none text-sm"
                            value={competencyDate}
                            onChange={(e) => setCompetencyDate(e.target.value)}
                        />
                    </div>
                </div>

                <Button variant="secondary" size="icon" className="text-slate-500">
                    <Filter size={20} />
                </Button>
            </div>

            {/* Credits List / Table Placeholder */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px]">
                {filteredCredits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <Plus size={32} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p>Nenhum crédito encontrado.</p>
                        <Button variant="link" onClick={() => setIsFormOpen(true)} className="mt-2">
                            Criar novo
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <ResizableTh
                                        width={getColumnWidth('id')}
                                        onResize={(w) => handleResize('id', w)}
                                        className="px-6 py-4 font-semibold"
                                    >ID</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('empresa')}
                                        onResize={(w) => handleResize('empresa', w)}
                                        className="px-6 py-4 font-semibold"
                                    >Empresa</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('periodo')}
                                        onResize={(w) => handleResize('periodo', w)}
                                        className="px-6 py-4 font-semibold"
                                    >Período</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('codigo')}
                                        onResize={(w) => handleResize('codigo', w)}
                                        className="px-6 py-4 font-semibold"
                                    >Código</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('tipo')}
                                        onResize={(w) => handleResize('tipo', w)}
                                        className="px-6 py-4 font-semibold"
                                    >Tipo</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('valor')}
                                        onResize={(w) => handleResize('valor', w)}
                                        className="px-6 py-4 font-semibold text-right"
                                    >
                                        <div className="w-full text-right">Valor Original</div>
                                    </ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('saldo')}
                                        onResize={(w) => handleResize('saldo', w)}
                                        className="px-6 py-4 font-semibold text-right"
                                    >
                                        <div className="w-full text-right">
                                            Saldo em {competencyDate ? competencyDate.split('-').reverse().join('/') : 'Atualmente'}
                                        </div>
                                    </ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('restituicao')}
                                        onResize={(w) => handleResize('restituicao', w)}
                                        className="px-6 py-4 font-semibold"
                                    >Pedido Restituição</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('modified_by')}
                                        onResize={(w) => handleResize('modified_by', w)}
                                        className="px-6 py-4 font-semibold"
                                    >
                                        Modificado por:
                                    </ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('actions')}
                                        onResize={(w) => handleResize('actions', w)}
                                        className="px-6 py-4 font-semibold text-center"
                                    >
                                        <div className="w-full text-center">Ações</div>
                                    </ResizableTh>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredCredits.map((credit) => {
                                    const balanceInfo = getBalanceAtCompetency(credit);
                                    return (
                                        <React.Fragment key={credit.id}>
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                                                    #{credit.id.toString().slice(-4)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-800 dark:text-white">{credit.empresa}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{credit.periodoApuracao}</td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono text-sm">{credit.codigoReceita}</td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">
                                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-medium">
                                                        {credit.tipoCredito}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                                                    {formatCurrency(credit.valorPrincipal)}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-bold ${balanceInfo.value === 0 ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    {formatCurrency(balanceInfo.value)}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-xs font-mono">
                                                    {(() => {
                                                        const linked = perdcomps.find(p => p.creditId === credit.id && p.isRestituicao);
                                                        return linked ? linked.numero : '-';
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{credit.modified_by || 'N/A'}</span>
                                                        {credit.modified_at && (
                                                            <span className="text-xs text-slate-400 dark:text-slate-500">
                                                                {new Date(credit.modified_at).toLocaleDateString('pt-BR')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="iconSm"
                                                            onClick={() => handleEdit(credit)}
                                                            className="text-slate-500 hover:text-irko-blue"
                                                            title="Editar"
                                                        >
                                                            <Pencil size={16} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="iconSm"
                                                            onClick={() => handleDelete(credit.id)}
                                                            className="text-slate-500 hover:text-red-500"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                        <Button
                                                            variant="link"
                                                            size="sm"
                                                            onClick={() => toggleDetails(credit.id)}
                                                            className="ml-2"
                                                        >
                                                            {expandedId === credit.id ? 'Ocultar' : 'Detalhes'}
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedId === credit.id && (
                                                <tr>
                                                    <td colSpan={10} className="px-6 py-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 shadow-inner">
                                                        <ErrorBoundary>
                                                            <EvolutionTable credit={credit} />
                                                        </ErrorBoundary>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isFormOpen && (
                <CreditForm
                    onClose={closeForm}
                    initialData={editingCredit}
                />
            )}

            <Modal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                title="Exportar Relatório de Créditos"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Empresa
                        </label>
                        <select
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-irko-blue outline-none"
                            value={exportOptions.company}
                            onChange={(e) => setExportOptions({ ...exportOptions, company: e.target.value })}
                        >
                            <option value="">Todas as Empresas</option>
                            {companies.map(company => (
                                <option key={company.id} value={company.name}>{company.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Competência (Mês de Referência do Saldo)
                        </label>
                        <input
                            type="month"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-irko-blue outline-none"
                            value={exportOptions.competency}
                            onChange={(e) => setExportOptions({ ...exportOptions, competency: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="ghost" onClick={() => setIsExportModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="success" onClick={confirmExport}>
                            <Download size={18} className="mr-2" />
                            Gerar Relatório
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
