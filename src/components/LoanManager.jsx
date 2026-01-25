import React, { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Landmark, Calendar, Percent, ChevronDown, ChevronUp, CreditCard, History } from 'lucide-react';
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
    const [calculatedBalances, setCalculatedBalances] = useState({}); // { loanId: { balanceOrg, balanceBrl, isLiquidated, rate } }
    const [loadingRates, setLoadingRates] = useState(false);

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
                    const s = parseISO(l.dataInicio);
                    if (isBefore(s, minStart)) minStart = s;
                    // If loan starts after refDate, we still need to process it (it will show as future/empty)
                });

                const ratesMap = {}; // { USD: [...] }

                // 2. Fetch Rates
                if (currencies.length > 0) {
                    await Promise.all(currencies.map(async (curr) => {
                        try {
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
                loans.forEach(loan => {
                    try {
                        // If loan starts after reference date, balance is 0 or arguably doesn't exist yet. 
                        // But let's show 0.
                        if (isAfter(parseISO(loan.dataInicio), refDate)) {
                            balances[loan.id] = { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
                            return;
                        }

                        // Get rates for this loan's currency
                        const loanRates = loan.moeda === 'BRL' ? [] : (ratesMap[loan.moeda] || []);

                        // Calculate evolution up to reference date
                        const evolution = calculateLoanEvolution(loan, loanRates, refDate);

                        if (!evolution || evolution.length === 0) {
                            balances[loan.id] = { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
                            return;
                        }

                        const lastMonth = evolution[evolution.length - 1];
                        if (!lastMonth || !lastMonth.dailyLogs || lastMonth.dailyLogs.length === 0) {
                            balances[loan.id] = { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
                            return;
                        }

                        const lastLog = lastMonth.dailyLogs[lastMonth.dailyLogs.length - 1];
                        if (!lastLog) {
                            balances[loan.id] = { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
                            return;
                        }

                        // Total Balance = Principal + Interest (Accumulated)
                        const totalBalanceOrg = lastLog.principalOrg + lastLog.interestOrgAcc;
                        const totalBalanceBrl = lastLog.totalBrl;
                        const rate = lastLog.rate;

                        // Liquidated logic: If Total Balance near zero.
                        const isLiquidated = totalBalanceOrg <= 0.01;

                        balances[loan.id] = {
                            balanceOrg: totalBalanceOrg,
                            balanceBrl: totalBalanceBrl,
                            isLiquidated,
                            rate
                        };
                    } catch (innerErr) {
                        console.error('Error calculating loan', loan.id, innerErr);
                        balances[loan.id] = { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
                    }
                });

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

    const filteredLoans = loans.filter(loan =>
        loan.instituicao.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getLoanSnapshot = (loanId) => {
        return calculatedBalances[loanId] || { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
    };

    const totalLoanValue = filteredLoans.reduce((acc, loan) => {
        return acc + getLoanSnapshot(loan.id).balanceBrl;
    }, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gerenciamento de Empréstimos</h2>
                    <p className="text-slate-500 dark:text-slate-400">Acompanhe e organize seus empréstimos e pagamentos.</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        Novo Empréstimo
                    </button>
                </div>
            </div>

            {/* Loans Summary Card */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
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
                <div className="flex items-center gap-2">
                    <Calendar size={20} className="text-slate-400" />
                    <input
                        type="month"
                        value={referenceMonth}
                        onChange={(e) => setReferenceMonth(e.target.value)}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Pesquisar por Devedor/Credor..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Loans Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px]">
                {filteredLoans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <Landmark size={32} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p>Nenhum empréstimo encontrado.</p>
                        <button onClick={() => setIsFormOpen(true)} className="text-blue-600 hover:underline mt-2">
                            Adicionar agora
                        </button>
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
                                                    <button
                                                        onClick={() => toggleExpand(loan.id)}
                                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-400"
                                                    >
                                                        {expandedId === loan.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
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
                                                <td className="px-6 py-4 text-center">

                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleAddPayment(loan.id)}
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                                            title="Adicionar Pagamento"
                                                        >
                                                            <CreditCard size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(loan)}
                                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(loan.id)}
                                                            className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {
                                                expandedId === loan.id && (
                                                    <tr>
                                                        <td colSpan={7} className="px-6 py-6 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 shadow-inner">
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
                )}
            </div>

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
        </div >
    );
}
