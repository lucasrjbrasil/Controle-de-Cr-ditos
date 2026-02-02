import { useState, useMemo } from 'react';
import { Download, RotateCcw, Plus } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import CreditForm from '../features/credits/components/CreditForm';
import { useCredits } from '../context/CreditsContext';
import { usePerdcomp } from '../context/PerdcompContext';
import { useCompanies } from '../context/CompanyContext';
import { useSelic } from '../hooks/useSelic';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Download as DownloadIcon } from 'lucide-react';

// New Components & Hooks
import CreditsFilters from '../features/credits/components/CreditsFilters';
import CreditsSummaryCard from '../features/credits/components/CreditsSummaryCard';
import CreditsTable from '../features/credits/components/CreditsTable';
import { useCreditBalances } from '../hooks/useCreditBalances';
import { useCreditExport } from '../hooks/useCreditExport';

export default function CreditsManager() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [editingCredit, setEditingCredit] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [competencyDate, setCompetencyDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Contexts
    const { credits, removeCredit, refreshCredits } = useCredits();
    const { rates } = useSelic();
    const { perdcomps, refreshPerdcomps } = usePerdcomp();
    const { companies } = useCompanies();
    const toast = useToast();

    // Custom Hooks
    const { getBalanceAtCompetency, totalBalance, balanceCache } = useCreditBalances(
        credits,
        perdcomps,
        rates,
        competencyDate
    );

    const {
        isExportModalOpen,
        setIsExportModalOpen,
        exportOptions,
        setExportOptions,
        openExportModal,
        confirmExport
    } = useCreditExport(credits, perdcomps, companies, rates);

    // Filter Logic
    const companyMap = useMemo(() => {
        const map = new Map();
        companies.forEach(c => map.set(c.name, c));
        return map;
    }, [companies]);

    const filteredCredits = useMemo(() => {
        let filtered = credits;

        // Text Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(credit => {
                const company = companyMap.get(credit.empresa);
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
                const balanceInfo = balanceCache.get(credit.id) || { value: 0 };
                return balanceInfo.value > 0;
            });
        }

        return filtered;
    }, [credits, searchTerm, showOnlyAvailable, balanceCache, companyMap]);

    // Handlers
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

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([refreshCredits(), refreshPerdcomps()]);
            toast.success('Dados atualizados com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
            toast.error('Erro ao atualizar dados.');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleConfirmExport = () => {
        confirmExport(getBalanceAtCompetency);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Saldo dos Créditos</h2>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie e monitore a evolução dos seus créditos tributários.</p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={handleRefresh}
                        className="gap-2"
                        disabled={isRefreshing}
                        title="Atualizar dados"
                    >
                        <RotateCcw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                    </Button>
                    <Button
                        variant="success"
                        onClick={() => openExportModal(competencyDate)}
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

            <CreditsSummaryCard
                totalBalance={totalBalance}
                competencyDate={competencyDate}
                filteredCount={filteredCredits.length}
            />

            <CreditsFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                showOnlyAvailable={showOnlyAvailable}
                setShowOnlyAvailable={setShowOnlyAvailable}
                competencyDate={competencyDate}
                setCompetencyDate={setCompetencyDate}
            />

            <CreditsTable
                credits={filteredCredits}
                expandedId={expandedId}
                competencyDate={competencyDate}
                perdcomps={perdcomps}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleDetails={toggleDetails}
                onGetBalance={getBalanceAtCompetency}
                onCreateNew={() => setIsFormOpen(true)}
            />

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
                        <Button variant="success" onClick={handleConfirmExport}>
                            <DownloadIcon size={18} className="mr-2" />
                            Gerar Relatório
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}


