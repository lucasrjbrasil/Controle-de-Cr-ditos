import React, { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Building2 } from 'lucide-react';
import { useCompanies } from '../context/CompanyContext';
import { useColumnResize } from '../hooks/useColumnResize';
import ResizableTh from './ui/ResizableTh';

export default function CompanyManager() {
    const { companies, addCompany, removeCompany, updateCompany } = useCompanies();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { columnWidths, handleResize, getColumnWidth } = useColumnResize({
        name: 250,
        cnpj: 180,
        group: 200,
        data: 150,
        actions: 100
    });
    const [editingCompany, setEditingCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleEdit = (company) => {
        setEditingCompany(company);
        setIsFormOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Tem certeza que deseja excluir esta empresa?')) {
            removeCompany(id);
        }
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingCompany(null);
    };

    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.cnpj.includes(searchTerm) ||
        (company.group && company.group.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gerenciamento de Empresas</h2>
                    <p className="text-slate-500 dark:text-slate-400">Cadastre e gerencie as empresas do grupo.</p>
                </div>

                <button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    Nova Empresa
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Pesquisar por Nome ou CNPJ..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                        <button onClick={() => setIsFormOpen(true)} className="text-blue-600 hover:underline mt-2">
                            Cadastrar primeira empresa
                        </button>
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
                                    >Razão Social</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('cnpj')}
                                        onResize={(w) => handleResize('cnpj', w)}
                                        className="px-6 py-4 font-semibold"
                                    >CNPJ</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('group')}
                                        onResize={(w) => handleResize('group', w)}
                                        className="px-6 py-4 font-semibold"
                                    >Grupo</ResizableTh>
                                    <ResizableTh
                                        width={getColumnWidth('data')}
                                        onResize={(w) => handleResize('data', w)}
                                        className="px-6 py-4 font-semibold"
                                    >Data Cadastro</ResizableTh>
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
                                            <div className="font-medium text-slate-800 dark:text-white">{company.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono">
                                            {company.cnpj}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md text-xs font-semibold">
                                                {company.group || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(company)}
                                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(company.id)}
                                                    className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
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
                    onSubmit={(data) => {
                        if (editingCompany) {
                            updateCompany(editingCompany.id, data);
                        } else {
                            addCompany(data);
                        }
                        closeForm();
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
        group: '',
    });
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        try {
            if (!formData.name || !formData.cnpj) {
                throw new Error('Preencha todos os campos obrigatórios.');
            }
            // Simple CNPJ validation (regex for 14 digits)
            const cleanCnpj = formData.cnpj.replace(/\D/g, '');
            if (cleanCnpj.length !== 14) {
                throw new Error('CNPJ inválido. Deve conter 14 dígitos.');
            }
            onSubmit({ ...formData, cnpj: cleanCnpj });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                            {initialData ? 'Editar Empresa' : 'Nova Empresa'}
                        </h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            &times;
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/30">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Razão Social</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Nome da empresa"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">CNPJ</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white"
                            value={formData.cnpj}
                            onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                            placeholder="00.000.000/0000-00"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Grupo</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white"
                            value={formData.group}
                            onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                            placeholder="Ex: Grupo Econômico A"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                            {initialData ? 'Salvar Alterações' : 'Cadastrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
