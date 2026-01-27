import React, { useState, useEffect } from 'react';
import { Save, HelpCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useCredits } from '../context/CreditsContext';
import { usePerdcomp } from '../context/PerdcompContext';
import { formatCurrency, parseCurrency } from '../utils/formatters';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';

export default function PerdcompForm({ onClose, initialData }) {
    const { credits } = useCredits();
    const { addPerdcomp, updatePerdcomp } = usePerdcomp();
    const toast = useToast();

    const [formData, setFormData] = useState({
        numero: '',
        dataCriacao: new Date().toISOString().split('T')[0],
        creditId: '',
        // Tax details
        codigoImposto: '',
        periodoApuracao: '',
        vencimento: '',
        valorPrincipal: '',
        multa: '',
        juros: '',
        valorTotal: '',
        status: 'Aguardando Homologação',
        isRestituicao: false
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                creditId: initialData.creditId || '',
            });
        }
    }, [initialData]);

    const calculateTotal = (principal, multa, juros) => {
        const p = typeof principal === 'string' ? parseCurrency(principal) : principal || 0;
        const m = typeof multa === 'string' ? parseCurrency(multa) : multa || 0;
        const j = typeof juros === 'string' ? parseCurrency(juros) : juros || 0;
        return p + m + j;
    };

    const handleValueChange = (field, value) => {
        const updated = { ...formData, [field]: value };

        // Auto-calculate Total
        const total = calculateTotal(
            field === 'valorPrincipal' ? value : updated.valorPrincipal,
            field === 'multa' ? value : updated.multa,
            field === 'juros' ? value : updated.juros
        );

        updated.valorTotal = total;
        setFormData(updated);
    };

    const [selectedCompany, setSelectedCompany] = useState('');

    useEffect(() => {
        if (initialData && initialData.creditId) {
            const credit = credits.find(c => c.id == initialData.creditId);
            if (credit) {
                setSelectedCompany(credit.empresa);
            }
        }
    }, [initialData, credits]);

    // Extract unique companies
    const companies = [...new Set(credits.map(c => c.empresa))].sort();

    // Filter credits by company
    const filteredCredits = selectedCompany
        ? credits.filter(c => c.empresa === selectedCompany)
        : [];

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation
        if (!formData.numero || !formData.creditId || !formData.valorPrincipal) {
            toast.warning("Preencha todos os campos obrigatórios");
            return;
        }

        if (!formData.isRestituicao && (!formData.codigoImposto || !formData.periodoApuracao || !formData.vencimento)) {
            toast.warning("Para PERDCOMP de compensação, os dados do imposto são obrigatórios");
            return;
        }

        // Validation for single refund request per credit
        if (formData.isRestituicao) {
            const alreadyHasRestituicao = perdcomps.find(p =>
                p.creditId === formData.creditId &&
                p.isRestituicao &&
                (!initialData || p.id !== initialData.id)
            );

            if (alreadyHasRestituicao) {
                toast.error(`Este crédito já possui um Pedido de Restituição vinculado (Nº ${alreadyHasRestituicao.numero}).`);
                return;
            }
        }

        const payload = {
            ...formData,
            valorPrincipal: typeof formData.valorPrincipal === 'string' ? parseCurrency(formData.valorPrincipal) : formData.valorPrincipal,
            multa: typeof formData.multa === 'string' ? parseCurrency(formData.multa) : formData.multa,
            juros: typeof formData.juros === 'string' ? parseCurrency(formData.juros) : formData.juros,
            valorCompensado: formData.valorTotal // Map total to the list view's expected field
        };

        if (initialData) {
            updatePerdcomp(initialData.id, payload);
        } else {
            addPerdcomp(payload);
        }
        onClose();
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={initialData ? 'Editar PERDCOMP' : 'Nova PERDCOMP'}
            maxWidth="4xl"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Número PERDCOMP
                        </label>
                        <Input
                            placeholder="00000.00000.00000000.00.00.00000"
                            value={formData.numero}
                            onChange={e => setFormData({ ...formData, numero: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Data de Transmissão
                        </label>
                        <Input
                            type="date"
                            value={formData.dataCriacao}
                            onChange={e => setFormData({ ...formData, dataCriacao: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 py-2 px-1">
                    <div className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            id="isRestituicao"
                            className="w-4 h-4 text-irko-blue rounded focus:ring-irko-blue border-slate-300 dark:border-slate-700 dark:bg-slate-800 transition-all cursor-pointer"
                            checked={formData.isRestituicao}
                            onChange={e => setFormData({ ...formData, isRestituicao: e.target.checked })}
                        />
                        <label htmlFor="isRestituicao" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer group-hover:text-irko-blue transition-colors">
                            Pedido de Restituição
                        </label>
                    </div>

                    <div className="group relative">
                        <HelpCircle size={16} className="text-slate-400 hover:text-irko-blue cursor-help transition-colors" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                            <p className="font-bold mb-1">Diferença entre Pedidos:</p>
                            <p className="mb-1"><span className="text-blue-300 font-bold">Restituição:</span> O contribuinte solicita a devolução do dinheiro em conta corrente.</p>
                            <p><span className="text-emerald-300 font-bold">Compensação:</span> O contribuinte utiliza o crédito para abater débitos de outros tributos.</p>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Empresa
                        </label>
                        <select
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={selectedCompany}
                            onChange={e => {
                                setSelectedCompany(e.target.value);
                                setFormData({ ...formData, creditId: '' }); // Reset credit selection
                            }}
                            required
                        >
                            <option value="">Selecione a empresa...</option>
                            {companies.map(company => (
                                <option key={company} value={company}>{company}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Crédito Utilizado
                        </label>
                        <select
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.creditId}
                            onChange={e => setFormData({ ...formData, creditId: e.target.value })}
                            required
                            disabled={!selectedCompany}
                        >
                            <option value="">Selecione um crédito...</option>
                            {filteredCredits.map(credit => (
                                <option key={credit.id} value={credit.id}>
                                    {credit.codigoReceita} ({credit.periodoApuracao}) - {formatCurrency(credit.valorPrincipal)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Dados do Imposto Compensado</h4>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                Código Imposto
                            </label>
                            <Input
                                placeholder="Ex: 5952"
                                value={formData.codigoImposto}
                                onChange={e => setFormData({ ...formData, codigoImposto: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                Período Apuração
                            </label>
                            <Input
                                placeholder="MM/AAAA"
                                value={formData.periodoApuracao}
                                onChange={e => setFormData({ ...formData, periodoApuracao: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                Vencimento
                            </label>
                            <Input
                                type="date"
                                value={formData.vencimento}
                                onChange={e => setFormData({ ...formData, vencimento: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Valor Principal (R$)
                            </label>
                            <Input
                                className="font-mono"
                                placeholder="0,00"
                                value={formData.valorPrincipal}
                                onChange={e => handleValueChange('valorPrincipal', e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Multa (R$)
                            </label>
                            <Input
                                className="font-mono"
                                placeholder="0,00"
                                value={formData.multa}
                                onChange={e => handleValueChange('multa', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Juros (R$)
                            </label>
                            <Input
                                className="font-mono"
                                placeholder="0,00"
                                value={formData.juros}
                                onChange={e => handleValueChange('juros', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-800 dark:text-white mb-1">
                                Valor Total (Calculado)
                            </label>
                            <div className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-900 dark:text-white font-mono font-bold">
                                {formatCurrency(formData.valorTotal || 0)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 gap-2 border-t border-slate-100 dark:border-slate-800">
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
                        Salvar PERDCOMP
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
