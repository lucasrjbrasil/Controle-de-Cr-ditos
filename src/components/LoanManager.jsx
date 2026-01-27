import React, { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Landmark, Calendar, Percent, ChevronDown, ChevronUp, CreditCard, History, Filter, Download } from 'lucide-react';
import { exportToExcel } from '../utils/exportUtils';
import Modal from './ui/Modal';
import { useLoans } from '../context/LoanContext';
import { useCompanies } from '../context/CompanyContext';
import { formatCurrency, formatCurrencyByCode } from '../utils/formatters';
import { format, parseISO, startOfMonth, endOfMonth, isAfter, isBefore, isValid } from 'date-fns';
import { calculateLoanEvolution } from '../utils/loanCalculator';
import { bcbService } from '../services/bcbService';
import LoanPaymentForm from './LoanPaymentForm';
import LoanForm from './LoanForm';
import LoanEvolutionTable from './LoanEvolutionTable';
import { useColumnResize } from '../hooks/useColumnResize';
import ResizableTh from './ui/ResizableTh';
import Button from './ui/Button';
import Input from './ui/Input';

export default function LoanManager() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { loans, removeLoan, removePayment } = useLoans();
    const { companies } = useCompanies();
    const { columnWidths, handleResize, getColumnWidth } = useColumnResize({
        expand: 50,
        empresa: 200,
        instituicao: 200,
        moeda: 100,
        taxa: 150,
        saldo: 150,
        modified_by: 180,
        actions: 120
    });
    const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
    const [editingLoan, setEditingLoan] = useState(null);
    const [activeLoanId, setActiveLoanId] = useState(null);
    const [editingPayment, setEditingPayment] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [detailTab, setDetailTab] = useState('entries'); // 'entries' or 'evolution'
    const [searchTerm, setSearchTerm] = useState('');
    const [referenceMonth, setReferenceMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
    const [calculatedBalances, setCalculatedBalances] = useState({}); // { loanId: { balanceOrg, balanceBrl, isLiquidated, rate } }
    const [loadingRates, setLoadingRates] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportOptions, setExportOptions] = useState({ company: '', competency: '' });

    // Fetch rates and calculate balances when loans or referenceMonth changes
    React.useEffect(() => {
        const calculateAll = async () => {
            if (!referenceMonth) return;
            if (!/^\d{4}-\d{2}$/.test(referenceMonth)) return; // Safety check

            const refDate = endOfMonth(parseISO(referenceMonth + '-01'));
            if (!isValid(refDate)) return;

            setLoadingRates(true);

            try {
                // 1. Identify needed currencies and time range
                const currencies = [...new Set(loans.map(l => l.moeda).filter(c => c && c !== 'BRL'))];

                // Find global min start date to fetch enough history
                let minStart = refDate;
                loans.forEach(l => {
                    const s = new Date(l.dataInicio);
                    if (isValid(s) && isBefore(s, minStart)) minStart = s;
                });

                const ratesMap = {}; // { USD: [...] }

                // 2. Fetch Rates
                if (currencies.length > 0) {
                    await Promise.all(currencies.map(async (curr) => {
                        try {
                            if (!isValid(minStart)) return;
                            const startStr = format(minStart, 'dd/MM/yyyy');
                            const endStr = format(refDate, 'dd/MM/yyyy');
                            const history = await bcbService.fetchExchangeRatesWithHistory(curr, startStr, endStr);
                            ratesMap[curr] = history;
                        } catch (e) {
                            console.error(`Error loading rates for ${curr}`, e);
                            ratesMap[curr] = [];
                        }
                    }));
                }

                // 3. Calculate Evolution for each loan
                const balances = {};
                for (const loan of loans) {
                    try {
                        const loanStart = new Date(loan.dataInicio);
                        if (!isValid(loanStart)) {
                            balances[loan.id] = { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
                            continue;
                        }

                        if (isAfter(loanStart, refDate)) {
                            balances[loan.id] = { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
                            continue;
                        }

                        // Get rates for this loan's currency
                        const loanRates = loan.moeda === 'BRL' ? [] : (ratesMap[loan.moeda] || []);

                        // Calculate evolution up to reference date
                        const evolution = calculateLoanEvolution(loan, loanRates, refDate);

                        if (!evolution || evolution.length === 0) {
                            balances[loan.id] = { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
                            continue;
                        }

                        const lastMonth = evolution[evolution.length - 1];
                        const lastLog = lastMonth?.dailyLogs?.[lastMonth.dailyLogs.length - 1];

                        if (!lastLog) {
                            balances[loan.id] = { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
                            continue;
                        }

                        // Total Balance = Principal + Interest (Accumulated)
                        const totalBalanceOrg = (lastLog.principalOrg || 0) + (lastLog.interestOrgAcc || 0);
                        const totalBalanceBrl = lastLog.totalBrl || 0;
                        const rate = lastLog.rate || 1;

                        balances[loan.id] = {
                            balanceOrg: totalBalanceOrg,
                            balanceBrl: totalBalanceBrl,
                            isLiquidated: totalBalanceOrg <= 0.01,
                            rate
                        };
                    } catch (innerErr) {
                        console.error('Error calculating loan', loan.id, innerErr);
                        balances[loan.id] = { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
                    }
                }

                setCalculatedBalances(balances);
            } catch (err) {
                console.error("Critical error in calculateAll", err);
            } finally {
                setLoadingRates(false);
            }
        };

        calculateAll();
    }, [loans, referenceMonth]);

    const handleEdit = (loan) => {
        setEditingLoan(loan);
        setIsFormOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Tem certeza que deseja excluir este empréstimo?')) {
            removeLoan(id);
        }
    };

    const handleAddPayment = (loanId) => {
        setActiveLoanId(loanId);
        setEditingPayment(null);
        setIsPaymentFormOpen(true);
    };

    const handleEditPayment = (loanId, payment) => {
        setActiveLoanId(loanId);
        setEditingPayment(payment);
        setIsPaymentFormOpen(true);
    };

    const toggleExpand = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingLoan(null);
    };

    const closePaymentForm = () => {
        setIsPaymentFormOpen(false);
        setActiveLoanId(null);
        setEditingPayment(null);
    };

    const filteredLoans = loans.filter(loan => {
        // Text Search
        const matchesSearch = loan.instituicao.toLowerCase().includes(searchTerm.toLowerCase());

        // Available Balance Filter
        if (showOnlyAvailable) {
            const snapshot = getLoanSnapshot(loan.id);
            if (snapshot.isLiquidated) return false;
        }

        return matchesSearch;
    });

    const getLoanSnapshot = (loanId) => {
        return calculatedBalances[loanId] || { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
    };

    const totalLoanValue = filteredLoans.reduce((acc, loan) => {
        return acc + getLoanSnapshot(loan.id).balanceBrl;
    }, 0);

    const handleExportClick = () => {
        setExportOptions({
            company: '',
            competency: referenceMonth
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gerenciamento de Empréstimos</h2>
                    <p className="text-slate-500 dark:text-slate-400">Acompanhe seus contratos de mútuo e financiamentos.</p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="success"
                        onClick={handleExportClick}
                        disabled={loans.length === 0}
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
                        Novo Empréstimo
                    </Button>
                </div>
            </div>


            {/* Loans Summary Card */}
            <div className="bg-gradient-to-br from-irko-blue via-[#004a8d] to-irko-orange/80 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="text-blue-100 text-sm font-medium mb-1">Saldo Devedor Total (Principal Estimado em BRL)</p>
                        <h3 className="text-4xl font-bold">{formatCurrency(totalLoanValue)}</h3>
                    </div>
                    <div className="text-right">
                        <p className="text-blue-200 text-xs">{filteredLoans.length} contratos ativos</p>
                    </div>
                </div>
            </div>

            {/* Filters / Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Input
                        icon={Search}
                        placeholder="Pesquisar por Banco/Credor..."
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
                            value={referenceMonth}
                            onChange={(e) => setReferenceMonth(e.target.value)}
                        />
                    </div>
                </div>

                <Button variant="secondary" size="icon" className="text-slate-500">
                    <Filter size={20} />
                </Button>
            </div>

            {/* Loans Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px]">
                {filteredLoans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <Landmark size={32} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p>Nenhum empréstimo encontrado.</p>
                        <Button variant="link" onClick={() => setIsFormOpen(true)} className="mt-2">
                            Adicionar agora
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <ResizableTh
                                        width={getColumnWidth('expand')}
                                        onResize={(w) => handleResize('expand', w)}
                                        className="px-6 py-4 font-semibold w-12"
                                    ></ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('empresa')}
                                        onResize={(w) => handleResize('empresa', w)}
                                        className="px-6 py-4 font-semibold"
                                    >Empresa</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('instituicao')}
                                        onResize={(w) => handleResize('instituicao', w)}
                                        className="px-6 py-4 font-semibold"
                                    >Instituição / Contraparte</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('moeda')}
                                        onResize={(w) => handleResize('moeda', w)}
                                        className="px-6 py-4 font-semibold"
                                    >Moeda</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('taxa')}
                                        onResize={(w) => handleResize('taxa', w)}
                                        className="px-6 py-4 font-semibold"
                                    >Taxa / Juros</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('saldo')}
                                        onResize={(w) => handleResize('saldo', w)}
                                        className="px-6 py-4 font-semibold text-right"
                                    >
                                        <div className="w-full text-right">Saldo Devedor</div>
                                    </ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('modified_by')}
                                        onResize={(w) => handleResize('modified_by', w)}
                                        className="px-6 py-4 font-semibold"
                                    >Modificado por:</ResizableTh>
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
                                {filteredLoans.map((loan) => {
                                    const { balanceOrg, balanceBrl, isLiquidated, rate } = getLoanSnapshot(loan.id);

                                    return (
                                        <React.Fragment key={loan.id}>
                                            <tr className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${expandedId === loan.id ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="iconSm"
                                                        onClick={() => toggleExpand(loan.id)}
                                                        className="text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                    >
                                                        {expandedId === loan.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </Button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-700 dark:text-slate-300">
                                                        {companies.find(c => c.id === loan.empresaId)?.name || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                                                            <Landmark size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-slate-800 dark:text-white">
                                                                {loan.instituicao}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`text-[10px] uppercase tracking-wider font-bold ${loan.categoria === 'Ativo' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                                    {loan.categoria}
                                                                </div>
                                                                {isLiquidated && (
                                                                    <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                                                                        Liquidado
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{loan.moeda}</span>
                                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                                            <Calendar size={12} />
                                                            {(() => {
                                                                try {
                                                                    return loan.dataInicio ? format(parseISO(loan.dataInicio), 'dd/MM/yyyy') : 'N/A';
                                                                } catch (e) {
                                                                    return 'Data Inválida';
                                                                }
                                                            })()}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                    <div className="flex flex-col">
                                                        <span className="flex items-center gap-1">
                                                            <Percent size={14} className="text-slate-400" />
                                                            {loan.taxa}% {loan.periodoTaxa}
                                                        </span>
                                                        <span className="text-xs text-slate-400">Juros {loan.tipoJuros}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className={`font-bold ${isLiquidated ? 'text-slate-400' : 'text-slate-800 dark:text-white'} text-lg`}>
                                                            {formatCurrencyByCode(balanceOrg, loan.moeda)}
                                                        </span>
                                                        {loan.moeda !== 'BRL' && (
                                                            <span className={`text-xs font-medium ${isLiquidated ? 'text-slate-400 bg-slate-100 dark:bg-slate-800' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'} px-1.5 py-0.5 rounded`}>
                                                                ≈ {formatCurrencyByCode(balanceBrl, 'BRL')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-xs">{loan.modified_by || 'N/A'}</span>
                                                        {loan.modified_at && (
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                                {new Date(loan.modified_at).toLocaleDateString('pt-BR')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">

                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="iconSm"
                                                            onClick={() => handleAddPayment(loan.id)}
                                                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                                            title="Adicionar Pagamento"
                                                        >
                                                            <CreditCard size={18} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="iconSm"
                                                            onClick={() => handleEdit(loan)}
                                                            className="text-slate-500 hover:text-blue-600"
                                                            title="Editar"
                                                        >
                                                            <Pencil size={16} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="iconSm"
                                                            onClick={() => handleDelete(loan.id)}
                                                            className="text-slate-500 hover:text-red-500"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {
                                                expandedId === loan.id && (
                                                    <tr>
                                                        <td colSpan={8} className="px-6 py-6 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 shadow-inner">
                                                            <div className="flex items-center gap-4 mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">
                                                                <button
                                                                    onClick={() => setDetailTab('entries')}
                                                                    className={`pb-2 px-1 text-sm font-bold uppercase tracking-wider transition-all relative ${detailTab === 'entries' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                                >
                                                                    Lançamentos
                                                                    {detailTab === 'entries' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>}
                                                                </button>
                                                                <button
                                                                    onClick={() => setDetailTab('evolution')}
                                                                    className={`pb-2 px-1 text-sm font-bold uppercase tracking-wider transition-all relative ${detailTab === 'evolution' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                                >
                                                                    Demonstrativo
                                                                    {detailTab === 'evolution' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>}
                                                                </button>
                                                            </div>

                                                            {detailTab === 'entries' ? (
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-4 text-slate-500">
                                                                        <History size={16} />
                                                                        <h4 className="text-xs font-bold uppercase tracking-wider">Histórico de Lançamentos</h4>
                                                                    </div>

                                                                    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                                                        <table className="w-full text-sm text-left">
                                                                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                                                                                <tr>
                                                                                    <th className="px-4 py-2">Data</th>
                                                                                    <th className="px-4 py-2">Tipo</th>
                                                                                    <th className="px-4 py-2">Valor</th>
                                                                                    <th className="px-4 py-2 text-center">Ações</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                                                                                {(() => {
                                                                                    const initialEntry = (loan.valorOriginal && loan.valorOriginal > 0) ? {
                                                                                        id: 'initial_entry',
                                                                                        data: loan.dataInicio,
                                                                                        tipo: 'INITIAL',
                                                                                        valor: loan.valorOriginal
                                                                                    } : null;

                                                                                    const allTransactions = [
                                                                                        ...(initialEntry ? [initialEntry] : []),
                                                                                        ...(loan.payments || [])
                                                                                    ].sort((a, b) => new Date(a.data) - new Date(b.data));

                                                                                    if (allTransactions.length === 0) {
                                                                                        return (
                                                                                            <tr>
                                                                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                                                                                    Nenhum lançamento registrado.
                                                                                                </td>
                                                                                            </tr>
                                                                                        );
                                                                                    }

                                                                                    return allTransactions.map((payment) => (
                                                                                        <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                                                            <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                                                                                                {isValid(parseISO(payment.data)) ? format(parseISO(payment.data), 'dd/MM/yyyy') : 'Data Inválida'}
                                                                                            </td>
                                                                                            <td className="px-4 py-2">
                                                                                                {payment.tipo === 'INITIAL' ? (
                                                                                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                                                                                                        Aporte Inicial
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${payment.tipo === 'ADDITION' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                                                                                        {payment.tipo === 'ADDITION' ? 'Novo Aporte' : 'Pagamento'}
                                                                                                    </span>
                                                                                                )}
                                                                                            </td>
                                                                                            <td className="px-4 py-2 font-medium">
                                                                                                <div className="flex flex-col">
                                                                                                    <span className={
                                                                                                        payment.tipo === 'INITIAL' ? 'text-violet-600 dark:text-violet-400' :
                                                                                                            payment.tipo === 'ADDITION' ? 'text-blue-600 dark:text-blue-400' :
                                                                                                                'text-emerald-600 dark:text-emerald-400'
                                                                                                    }>
                                                                                                        {payment.tipo === 'PAYMENT' ? '-' : '+'} {formatCurrencyByCode(payment.valor, loan.moeda)}
                                                                                                    </span>
                                                                                                    {payment.tipo === 'PAYMENT' && payment.valorJuros > 0 && (
                                                                                                        <span className="text-[10px] text-slate-400">
                                                                                                            P: {formatCurrencyByCode(payment.valorPrincipal, loan.moeda)} | J: {formatCurrencyByCode(payment.valorJuros, loan.moeda)}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </td>
                                                                                            <td className="px-4 py-2">
                                                                                                {payment.tipo !== 'INITIAL' && (
                                                                                                    <div className="flex items-center justify-center gap-2">
                                                                                                        <button
                                                                                                            onClick={() => handleEditPayment(loan.id, payment)}
                                                                                                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                                                                                            title="Editar"
                                                                                                        >
                                                                                                            <Pencil size={14} />
                                                                                                        </button>
                                                                                                        <button
                                                                                                            onClick={() => removePayment(loan.id, payment.id)}
                                                                                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                                                                            title="Excluir"
                                                                                                        >
                                                                                                            <Trash2 size={14} />
                                                                                                        </button>
                                                                                                    </div>
                                                                                                )}
                                                                                            </td>
                                                                                        </tr>
                                                                                    ));
                                                                                })()}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <LoanEvolutionTable loan={loan} />
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            }
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
                }
            </div >

            {
                isFormOpen && (
                    <LoanForm
                        onClose={closeForm}
                        initialData={editingLoan}
                    />
                )
            }

            {
                isPaymentFormOpen && (
                    <LoanPaymentForm
                        loanId={activeLoanId}
                        initialData={editingPayment}
                        onClose={closePaymentForm}
                    />
                )
            }

            <Modal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                title="Exportar Relatório de Empréstimos"
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
                            Competência de Referência
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
                        <Button variant="success" onClick={confirmExport} disabled={loadingRates}>
                            <Download size={18} className="mr-2" />
                            {loadingRates ? 'Gerando...' : 'Gerar Relatório'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div >
    );
}
