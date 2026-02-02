import { useState, useMemo, Fragment } from 'react';
import { Plus, Search, Pencil, Trash2, FileText, Download } from 'lucide-react';
import InstallmentForm from '../features/installments/components/InstallmentForm';
import { useInstallment } from '../context/InstallmentContext';
import { useCompanies } from '../context/CompanyContext';
import { useColumnResize } from '../hooks/useColumnResize';
import ResizableTh from '../components/ui/ResizableTh';
import { formatCurrency } from '../utils/formatters';
import { exportToExcel } from '../utils/exportUtils';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import InstallmentEvolutionTable from '../features/installments/components/InstallmentEvolutionTable';

export default function InstallmentManager() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { columnWidths, handleResize, getColumnWidth } = useColumnResize({
        empresa: 150,
        processo: 120,
        categoria: 100,
        dataInicio: 100,
        valorOriginal: 120,
        prazo: 80,
        status: 100,
        modified_by: 150,
        actions: 80
    });
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedId, setExpandedId] = useState(null);


    // Using existing installmet hook and company hook
    const { installments, removeInstallment } = useInstallment();
    const { companies } = useCompanies();

    const handleEdit = (item) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Tem certeza que deseja excluir este parcelamento?')) {
            removeInstallment(id);
        }
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingItem(null);
    };

    const getCompanyName = (empresaId) => {
        const company = companies.find(c => c.id === empresaId);
        return company ? company.name : 'N/A';
    };

    const filteredInstallments = useMemo(() => {
        if (!searchTerm) return installments;

        const lowerTerm = searchTerm.toLowerCase();
        return installments.filter(item => {
            const companyName = getCompanyName(item.empresaId).toLowerCase();
            return (
                companyName.includes(lowerTerm) ||
                (item.numeroProcesso && item.numeroProcesso.toLowerCase().includes(lowerTerm)) ||
                (item.categoria && item.categoria.toLowerCase().includes(lowerTerm))
            );
        });
    }, [installments, searchTerm, companies]);

    const toggleDetails = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const handleExport = () => {
        if (filteredInstallments.length === 0) return;

        const dataToExport = filteredInstallments.map(item => ({
            "Empresa": getCompanyName(item.empresaId),
            "Processo": item.numeroProcesso,
            "Programa/Categoria": item.categoria,
            "Data Consolidação": item.dataInicio ? new Date(item.dataInicio).toLocaleDateString() : '',
            "Valor Original": item.valorOriginal,
            "Prazo (Meses)": item.prazo,
            "Status": item.status || 'Ativo',
            "Modificado por": item.modified_by ? `${item.modified_by} (${new Date(item.modified_at).toLocaleDateString()})` : ''
        }));

        exportToExcel(dataToExport, `Relatorio_Parcelamentos_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const totalOriginal = useMemo(() => {
        return filteredInstallments.reduce((acc, curr) => acc + (parseFloat(curr.valorOriginal) || 0), 0);
    }, [filteredInstallments]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gerenciamento de Parcelamentos</h2>
                    <p className="text-slate-500 dark:text-slate-400">Controle e acompanhe os parcelamentos tributários.</p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="success"
                        onClick={handleExport}
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
                        Novo Parcelamento
                    </Button>
                </div>
            </div>

            {/* Total Card */}
            <div className="bg-gradient-to-br from-irko-blue via-[#004a8d] to-irko-orange/80 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="text-blue-100/80 text-sm font-medium mb-1">Total Consolidado</p>
                        <h3 className="text-4xl font-bold">{formatCurrency(totalOriginal)}</h3>
                    </div>
                    <div className="text-right">
                        <p className="text-white/60 text-xs">Considerando {filteredInstallments.length} parcelamentos</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="relative w-full md:w-96">
                    <Input
                        icon={Search}
                        placeholder="Pesquisar por Empresa, Processo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px]">
                {filteredInstallments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <FileText size={32} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p>Nenhum parcelamento encontrado.</p>
                        <Button variant="link" onClick={() => setIsFormOpen(true)} className="mt-2">
                            Criar novo
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">
                                <tr>
                                    <ResizableTh width={getColumnWidth('empresa')} onResize={(w) => handleResize('empresa', w)} className="px-3 py-3 font-semibold">Empresa</ResizableTh>
                                    <ResizableTh width={getColumnWidth('processo')} onResize={(w) => handleResize('processo', w)} className="px-3 py-3 font-semibold">Processo</ResizableTh>
                                    <ResizableTh width={getColumnWidth('categoria')} onResize={(w) => handleResize('categoria', w)} className="px-3 py-3 font-semibold">Programa</ResizableTh>
                                    <ResizableTh width={getColumnWidth('dataInicio')} onResize={(w) => handleResize('dataInicio', w)} className="px-3 py-3 font-semibold">Consolidação</ResizableTh>
                                    <ResizableTh width={getColumnWidth('valorOriginal')} onResize={(w) => handleResize('valorOriginal', w)} className="px-3 py-3 font-semibold text-right">Valor Original</ResizableTh>
                                    <ResizableTh width={getColumnWidth('prazo')} onResize={(w) => handleResize('prazo', w)} className="px-3 py-3 font-semibold text-center">Prazo</ResizableTh>
                                    <ResizableTh width={getColumnWidth('modified_by')} onResize={(w) => handleResize('modified_by', w)} className="px-3 py-3 font-semibold">Modificado por</ResizableTh>
                                    <ResizableTh width={getColumnWidth('actions')} onResize={(w) => handleResize('actions', w)} className="px-3 py-3 font-semibold text-center">Ações</ResizableTh>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredInstallments.map((item) => (
                                    <Fragment key={item.id}>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-3 py-3 font-medium text-xs text-slate-800 dark:text-white whitespace-nowrap max-w-[150px] truncate" title={getCompanyName(item.empresaId)}>
                                                {getCompanyName(item.empresaId)}
                                            </td>
                                            <td className="px-3 py-3 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                {item.numeroProcesso || '-'}
                                            </td>
                                            <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                {item.categoria || '-'}
                                            </td>
                                            <td className="px-3 py-3 text-slate-600 dark:text-slate-300 text-[10px] whitespace-nowrap">
                                                {item.dataInicio ? new Date(item.dataInicio).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-3 py-3 text-right text-[10px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                {formatCurrency(item.valorOriginal)}
                                            </td>
                                            <td className="px-3 py-3 text-center text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                {item.prazo}x
                                            </td>
                                            <td className="px-3 py-3 text-slate-600 dark:text-slate-300 text-[10px] whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{item.modified_by || 'N/A'}</span>
                                                    {item.modified_at && (
                                                        <span className="text-[8px] text-slate-400 dark:text-slate-500">
                                                            {new Date(item.modified_at).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="iconSm"
                                                        onClick={() => handleEdit(item)}
                                                        className="text-slate-500 hover:text-blue-600"
                                                    >
                                                        <Pencil size={14} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="iconSm"
                                                        onClick={() => handleDelete(item.id)}
                                                        className="text-slate-500 hover:text-red-500"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                    <Button
                                                        variant="link"
                                                        size="sm"
                                                        onClick={() => toggleDetails(item.id)}
                                                        className="ml-2"
                                                    >
                                                        {expandedId === item.id ? 'Ocultar' : 'Detalhes'}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedId === item.id && (
                                            <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                                                <td colSpan="8" className="px-4 py-4 shadow-inner">
                                                    <div className="pl-4 border-l-2 border-irko-blue">
                                                        <InstallmentEvolutionTable installment={item} />
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isFormOpen && (
                <InstallmentForm
                    onClose={closeForm}
                    initialData={editingItem}
                />
            )}
        </div>
    );
}


