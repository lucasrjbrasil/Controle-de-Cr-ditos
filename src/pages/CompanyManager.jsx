import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Building2, MapPin, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { useCompanies } from '../context/CompanyContext';
import { useColumnResize } from '../hooks/useColumnResize';
import ResizableTh from '../components/ui/ResizableTh';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { cnpjService } from '../services/cnpjService';
import { useToast } from '../context/ToastContext';
import { formatCNPJ } from '../utils/formatters';

export default function CompanyManager() {
    const { companies, addCompany, removeCompany, updateCompany } = useCompanies();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { columnWidths, handleResize, getColumnWidth } = useColumnResize({
        name: 250,
        group: 150,
        cnpj: 150,
        city: 150,
        status: 120,
        actions: 100
    });
    const [editingCompany, setEditingCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const toast = useToast();

    const handleEdit = (company) => {
        setEditingCompany(company);
        setIsFormOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir esta empresa?')) {
            try {
                await removeCompany(id);
                toast.success('Empresa excluída com sucesso!');
            } catch (error) {
                toast.error('Erro ao excluir empresa.');
            }
        }
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingCompany(null);
    };

    const filteredCompanies = companies.filter(company => {
        const searchLower = searchTerm.toLowerCase();
        const searchClean = searchTerm.replace(/\D/g, '');

        const safeIncludes = (text) => text?.toLowerCase().includes(searchLower) || false;
        const safeCleanIncludes = (text) => text?.toString().replace(/\D/g, '').includes(searchClean) || false;

        return (
            safeIncludes(company.name) ||
            safeCleanIncludes(company.cnpj) ||
            safeIncludes(company.nickname) ||
            safeIncludes(company.address) ||
            safeIncludes(company.neighborhood) ||
            safeIncludes(company.city) ||
            safeIncludes(company.state) ||
            safeIncludes(company.status) ||
            safeIncludes(company.group) ||
            safeCleanIncludes(company.zip_code)
        );
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gerenciamento de Empresas</h2>
                    <p className="text-slate-500 dark:text-slate-400">Cadastre e gerencie as empresas do grupo.</p>
                </div>

                <Button
                    onClick={() => setIsFormOpen(true)}
                    className="gap-2"
                >
                    <Plus size={20} />
                    Nova Empresa
                </Button>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                <div className="relative flex-1">
                    <Input
                        icon={Search}
                        placeholder="Pesquisar por Nome, CNPJ, Cidade, Endereço..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Company List */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px]">
                {filteredCompanies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <Building2 size={32} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p>Nenhuma empresa encontrada.</p>
                        <Button variant="link" onClick={() => setIsFormOpen(true)} className="mt-2">
                            Cadastrar primeira empresa
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <ResizableTh
                                        width={getColumnWidth('name')}
                                        onResize={(w) => handleResize('name', w)}
                                        className="px-6 py-4 font-semibold"
                                    >Empresa</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('group')}
                                        onResize={(w) => handleResize('group', w)}
                                        className="px-6 py-4 font-semibold"
                                    >Grupo</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('cnpj')}
                                        onResize={(w) => handleResize('cnpj', w)}
                                        className="px-6 py-4 font-semibold"
                                    >CNPJ</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('city')}
                                        onResize={(w) => handleResize('city', w)}
                                        className="px-6 py-4 font-semibold"
                                    >Cidade/UF</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('status')}
                                        onResize={(w) => handleResize('status', w)}
                                        className="px-6 py-4 font-semibold"
                                    >Situação</ResizableTh>
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
                                {filteredCompanies.map((company) => (
                                    <tr key={company.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-800 dark:text-white">{company.name}</span>
                                                {company.nickname && (
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">{company.nickname}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">
                                            {company.group || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono text-sm">
                                            {formatCNPJ(company.cnpj)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">
                                            {company.city && company.state ? `${company.city}/${company.state}` : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {company.status ? (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${company.status === 'ATIVA' || company.status === 'Ativa'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}>
                                                    {company.status}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-xs text-center">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="iconSm"
                                                    onClick={() => handleEdit(company)}
                                                    className="text-slate-500 hover:text-blue-600"
                                                    title="Editar"
                                                >
                                                    <Pencil size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="iconSm"
                                                    onClick={() => handleDelete(company.id)}
                                                    className="text-slate-500 hover:text-red-500"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isFormOpen && (
                <CompanyForm
                    onClose={closeForm}
                    initialData={editingCompany}
                    onSubmit={async (data) => {
                        try {
                            if (editingCompany) {
                                await updateCompany(editingCompany.id, data);
                                toast.success('Empresa atualizada com sucesso!');
                            } else {
                                await addCompany(data);
                                toast.success('Empresa cadastrada com sucesso!');
                            }
                            closeForm();
                            return true;
                        } catch (err) {
                            toast.error(err.message || 'Erro ao salvar empresa.');
                            return false;
                        }
                    }}
                />
            )}
        </div>
    );
}

function CompanyForm({ onClose, initialData, onSubmit }) {
    const [formData, setFormData] = useState(initialData || {
        name: '',
        cnpj: '',
        nickname: '',
        group: '',
        zip_code: '',
        address: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        status: '',
    });
    const [loadingCnpj, setLoadingCnpj] = useState(false);
    const { toast } = useToast();

    const handleConsultarCnpj = async () => {
        if (!formData.cnpj || formData.cnpj.length < 14) {
            toast.warning('Digite um CNPJ válido para consultar.');
            return;
        }

        setLoadingCnpj(true);
        try {
            const data = await cnpjService.fetchByCnpj(formData.cnpj);

            setFormData(prev => ({
                ...prev,
                name: data.razao_social || data.nome_fantasia || '',
                nickname: data.nome_fantasia || '',
                zip_code: data.cep ? data.cep.toString().replace(/^(\d{5})(\d{3})$/, "$1-$2") : '',
                address: data.logradouro || '',
                number: data.numero || '',
                complement: data.complemento || '',
                neighborhood: data.bairro || '',
                city: data.municipio || '',
                state: data.uf || '',
                status: data.descricao_situacao_cadastral || '',
            }));

            toast.success('Dados carregados com sucesso!');
        } catch (error) {
            toast.error(error.message || 'Erro ao consultar CNPJ.');
        } finally {
            setLoadingCnpj(false);
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.cnpj) {
            toast.warning('Preencha os campos obrigatórios (Razão Social e CNPJ).');
            return;
        }

        // Simple CNPJ validation
        const cleanCnpj = formData.cnpj.replace(/\D/g, '');
        if (cleanCnpj.length !== 14) {
            toast.warning('CNPJ inválido. Deve conter 14 dígitos.');
            return;
        }

        setIsSubmitting(true);
        // onSubmit handles the try/catch and toasts
        // It returns true on success, false on error
        const success = await onSubmit({ ...formData, cnpj: cleanCnpj });

        // Only reset loading state if it FAILED (form stays open)
        // If success, the component will unmount (modal closes), so we don't touch state
        if (!success) {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={initialData ? 'Editar Empresa' : 'Nova Empresa'}
            maxWidth="2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Dados Principais */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-4 border border-slate-100 dark:border-slate-800">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                        <Building2 size={18} />
                        Dados Cadastrais
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CNPJ *</label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Input
                                        placeholder="00.000.000/0001-00"
                                        value={formData.cnpj}
                                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                                        className="font-mono"
                                        autoFocus
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleConsultarCnpj}
                                    variant="secondary"
                                    disabled={loadingCnpj}
                                    className="whitespace-nowrap"
                                    title="Consultar na RFB"
                                >
                                    {loadingCnpj ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                    <span className="hidden sm:inline ml-1">Consultar</span>
                                </Button>
                            </div>
                        </div>

                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Situação Cadastral</label>
                            <Input
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                placeholder="ATIVA"
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Razão Social *</label>
                            <Input
                                placeholder="Nome da empresa"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Fantasia (Apelido)</label>
                            <Input
                                placeholder="Opcional"
                                value={formData.nickname}
                                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Grupo Econômico</label>
                            <Input
                                placeholder="Ex: Grupo X"
                                value={formData.group}
                                onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Endereço */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-4 border border-slate-100 dark:border-slate-800">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                        <MapPin size={18} />
                        Endereço
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CEP</label>
                            <Input
                                placeholder="00000-000"
                                value={formData.zip_code}
                                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-3">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Logradouro</label>
                            <Input
                                placeholder="Rua, Av..."
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Número</label>
                            <Input
                                placeholder="123"
                                value={formData.number}
                                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Complemento</label>
                            <Input
                                placeholder="Sala 101"
                                value={formData.complement}
                                onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bairro</label>
                            <Input
                                placeholder="Centro"
                                value={formData.neighborhood}
                                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cidade</label>
                            <Input
                                placeholder="São Paulo"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">UF</label>
                            <Input
                                placeholder="SP"
                                maxLength={2}
                                value={formData.state}
                                onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex gap-3 border-t border-slate-100 dark:border-slate-800">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1"
                        type="button"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin mr-2" />
                                Salvando...
                            </>
                        ) : (
                            initialData ? 'Salvar Alterações' : 'Cadastrar'
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}


