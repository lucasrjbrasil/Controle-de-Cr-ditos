import { useState } from 'react';
import { Plus, Save, AlertCircle } from 'lucide-react';
import { useCredits } from '../../../context/CreditsContext';
import { useCompanies } from '../../../context/CompanyContext';
import { usePerdcomp } from '../../../context/PerdcompContext';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import { formatCNPJ } from '../../../utils/formatters';

export default function CreditForm({ onClose, initialData = null }) {
    const { addCredit, updateCredit, credits } = useCredits();
    const { companies } = useCompanies();
    const { perdcomps } = usePerdcomp();
    // Busca a empresa correspondente para preencher company_id e cnpj inicialmente
    const initialCompany = initialData?.empresa
        ? companies.find(c => c.name === initialData.empresa)
        : null;

    const [formData, setFormData] = useState({
        empresa: initialData?.empresa || '',
        company_id: initialData?.company_id || initialCompany?.id || null,
        cnpj: initialData?.cnpj || initialCompany?.cnpj || null,
        tipoCredito: initialData?.tipoCredito || 'Saldo Negativo de IRPJ',
        codigoReceita: initialData?.codigoReceita || '',
        periodoApuracao: initialData?.periodoApuracao || '',
        valorPrincipal: initialData?.valorPrincipal || '',
        dataArrecadacao: initialData?.dataArrecadacao || '',
    });
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Se for o campo empresa, busca o company_id e cnpj da empresa selecionada
        if (name === 'empresa') {
            const selectedCompany = companies.find(c => c.name === value);
            setFormData((prev) => ({
                ...prev,
                [name]: value,
                company_id: selectedCompany?.id || null,
                cnpj: selectedCompany?.cnpj || null,
            }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
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
        <Modal
            isOpen={true}
            onClose={onClose}
            title={
                <span className="flex items-center gap-2">
                    <Plus size={20} className="text-irko-blue" />
                    {initialData ? 'Editar Crédito' : 'Novo Crédito'}
                </span>
            }
            maxWidth="4xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
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
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-irko-blue focus:outline-none transition-all"
                            required
                        >
                            <option value="">Selecione uma empresa</option>
                            {companies.map((company) => (
                                <option key={company.id} value={company.name}>
                                    {company.name} ({formatCNPJ(company.cnpj)})
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
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-irko-blue focus:outline-none transition-all"
                        >
                            <option>Saldo Negativo de IRPJ</option>
                            <option>Saldo Negativo de CSLL</option>
                            <option>Pagamento Indevido ou a Maior</option>
                            <option>Retenção na Fonte</option>
                            <option>Crédito de Estimativa</option>
                            <option>Crédito Previdenciário</option>
                            <option>Crédito de PIS</option>
                            <option>Crédito de COFINS</option>
                            <option>Crédito de IPI</option>
                            <option>Crédito de PIS/COFINS – Importação</option>
                            <option>Crédito Presumido</option>
                            <option>Crédito Acumulado</option>
                            <option>Crédito Decorrente de Decisão Judicial</option>
                            <option>Crédito de Ressarcimento</option>
                            <option>Outros Créditos Administráveis pela RFB</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Código da Receita</label>
                        <Input
                            name="codigoReceita"
                            value={formData.codigoReceita}
                            onChange={handleChange}
                            placeholder="Ex: 5993"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Período de Apuração</label>
                        <Input
                            name="periodoApuracao"
                            value={formData.periodoApuracao}
                            onChange={handleChange}
                            placeholder="MM/AAAA"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Valor Principal (R$)</label>
                        <Input
                            type="number"
                            step="0.01"
                            name="valorPrincipal"
                            value={formData.valorPrincipal}
                            onChange={handleChange}
                            placeholder="0,00"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Data de Arrecadação</label>
                        <Input
                            type="date"
                            name="dataArrecadacao"
                            value={formData.dataArrecadacao}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {initialData && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 font-bold">Pedido de Restituição</label>
                            <div className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-sm h-[42px] flex items-center">
                                {(() => {
                                    const linked = perdcomps.find(p => p.creditId === initialData.id && p.isRestituicao);
                                    return linked ? linked.numero : 'Nenhuma PERDCOMP vinculada';
                                })()}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        type="button"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        className="flex items-center gap-2"
                    >
                        <Save size={18} />
                        Salvar Crédito
                    </Button>
                </div>
            </form>
        </Modal>
    );
}


