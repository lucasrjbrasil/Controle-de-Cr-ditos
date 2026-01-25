import React, { useState } from 'react';
import { Plus, X, Save, AlertCircle } from 'lucide-react';
import { useCredits } from '../context/CreditsContext';
import { useCompanies } from '../context/CompanyContext';

export default function CreditForm({ onClose, initialData = null }) {
    const { addCredit, updateCredit, credits } = useCredits();
    const { companies } = useCompanies();
    const [formData, setFormData] = useState({
        empresa: initialData?.empresa || '',
        tipoCredito: initialData?.tipoCredito || 'Saldo Negativo IRPJ',
        codigoReceita: initialData?.codigoReceita || '',
        periodoApuracao: initialData?.periodoApuracao || '',
        valorPrincipal: initialData?.valorPrincipal || '',
        dataArrecadacao: initialData?.dataArrecadacao || '',
    });
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError(null);
    };

    const generateIntegrityHash = (data) => {
        // Simple hash for duplication check: Empresa + PA + Codigo + Valor
        const raw = `${data.empresa.trim().toLowerCase()}-${data.periodoApuracao}-${data.codigoReceita.trim()}-${parseFloat(data.valorPrincipal).toFixed(2)}`;
        return btoa(raw); // Base64 check
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.empresa || !formData.valorPrincipal || !formData.dataArrecadacao) {
            setError('Preencha todos os campos obrigatórios.');
            return;
        }

        try {
            const hash = generateIntegrityHash(formData);

            if (initialData && initialData.id) {
                // Update mode
                const updatedCredit = {
                    ...formData,
                    valorPrincipal: parseFloat(formData.valorPrincipal),
                    integrityHash: hash,
                    id: initialData.id,
                    createdAt: initialData.createdAt,
                    compensations: initialData.compensations
                };
                updateCredit(initialData.id, updatedCredit);
            } else {
                // Create mode
                const newCredit = {
                    ...formData,
                    valorPrincipal: parseFloat(formData.valorPrincipal),
                    integrityHash: hash,
                    compensations: []
                };
                addCredit(newCredit);
            }
            onClose();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Plus size={20} className="text-blue-600" />
                        {initialData ? 'Editar Crédito' : 'Novo Crédito'}
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-red-500 transition-colors">
                        <X size={20} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Empresa</label>
                            <select
                                name="empresa"
                                value={formData.empresa}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                required
                            >
                                <option value="">Selecione uma empresa</option>
                                {companies.map((company) => (
                                    <option key={company.id} value={company.name}>
                                        {company.name} ({company.cnpj})
                                    </option>
                                ))}
                            </select>
                            {companies.length === 0 && (
                                <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    Nenhuma empresa cadastrada. Vá até a aba Empresas.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Tipo de Crédito</label>
                            <select
                                name="tipoCredito"
                                value={formData.tipoCredito}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            >
                                <option>Saldo Negativo IRPJ</option>
                                <option>Saldo Negativo CSLL</option>
                                <option>Pagamento a Maior</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Código da Receita</label>
                            <input
                                type="text"
                                name="codigoReceita"
                                value={formData.codigoReceita}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                placeholder="Ex: 5993"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Período de Apuração</label>
                            <input
                                type="text"
                                name="periodoApuracao"
                                value={formData.periodoApuracao}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                placeholder="MM/AAAA"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Valor Principal (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                name="valorPrincipal"
                                value={formData.valorPrincipal}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                placeholder="0,00"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Data de Arrecadação</label>
                            <input
                                type="date"
                                name="dataArrecadacao"
                                value={formData.dataArrecadacao}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all"
                        >
                            <Save size={18} />
                            Salvar Crédito
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
