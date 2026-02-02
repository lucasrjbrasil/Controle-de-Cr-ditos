import { useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useLoans } from '../context/LoanContext';
import { useCompanies } from '../context/CompanyContext';
import LoanPaymentForm from '../features/loans/components/LoanPaymentForm';
import LoanForm from '../features/loans/components/LoanForm';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Download as DownloadIcon } from 'lucide-react';

// New Components & Hooks
import LoansFilters from '../features/loans/components/LoansFilters';
import LoansSummaryCard from '../features/loans/components/LoansSummaryCard';
import LoansTable from '../features/loans/components/LoansTable';
import { useLoanCalculations } from '../hooks/useLoanCalculations';
import { useLoanExport } from '../hooks/useLoanExport';

export default function LoanManager() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { loans, removeLoan, removePayment } = useLoans();
    const { companies } = useCompanies();

    // State
    const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
    const [editingLoan, setEditingLoan] = useState(null);
    const [activeLoanId, setActiveLoanId] = useState(null);
    const [editingPayment, setEditingPayment] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [referenceMonth, setReferenceMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

    // Custom Hooks
    const {
        calculatedBalances,
        getLoanSnapshot,
        loadingRates
    } = useLoanCalculations(loans, referenceMonth);

    const {
        isExportModalOpen,
        setIsExportModalOpen,
        exportOptions,
        setExportOptions,
        openExportModal,
        confirmExport,
        loadingRates: loadingExport
    } = useLoanExport(loans, companies);

    // Derived Logic for Filters/Totals
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

    const totalLoanValue = filteredLoans.reduce((acc, loan) => {
        return acc + getLoanSnapshot(loan.id).balanceBrl;
    }, 0);

    // Handlers
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

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingLoan(null);
    };

    const closePaymentForm = () => {
        setIsPaymentFormOpen(false);
        setActiveLoanId(null);
        setEditingPayment(null);
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
                        onClick={() => openExportModal(referenceMonth)}
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

            <LoansSummaryCard
                totalLoanValue={totalLoanValue}
                filteredCount={filteredLoans.length}
            />

            <LoansFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                showOnlyAvailable={showOnlyAvailable}
                setShowOnlyAvailable={setShowOnlyAvailable}
                referenceMonth={referenceMonth}
                setReferenceMonth={setReferenceMonth}
            />

            <LoansTable
                loans={filteredLoans}
                companies={companies}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddPayment={handleAddPayment}
                onEditPayment={handleEditPayment}
                onRemovePayment={removePayment}
                getLoanSnapshot={getLoanSnapshot}
                onCreateNew={() => setIsFormOpen(true)}
            />

            {isFormOpen && (
                <LoanForm
                    onClose={closeForm}
                    initialData={editingLoan}
                />
            )}

            {isPaymentFormOpen && (
                <LoanPaymentForm
                    loanId={activeLoanId}
                    initialData={editingPayment}
                    onClose={closePaymentForm}
                />
            )}

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
                        <Button variant="success" onClick={confirmExport} disabled={loadingExport}>
                            <DownloadIcon size={18} className="mr-2" />
                            Gerar Relatório
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}


