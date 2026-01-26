import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useCredits } from '../context/CreditsContext';
import { usePerdcomp } from '../context/PerdcompContext';
import { formatCurrency, parseCurrency } from '../utils/formatters';
import Button from './ui/Button';
import Input from './ui/Input';

export default function PerdcompForm({ onClose, initialData }) {
    const { credits } = useCredits();
    const { addPerdcomp, updatePerdcomp } = usePerdcomp();

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

        status: 'Aguardando Homologação'
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
        // ... (existing submit logic, no changes needed here but context requires it to be outside this block)
        e.preventDefault();

        // Validation
        if (!formData.numero || !formData.creditId || !formData.valorPrincipal) {
            alert("Preencha todos os campos obrigatórios");
            return;
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        {initialData ? 'Editar PERDCOMP' : 'Nova PERDCOMP'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
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

                    <div className="flex justify-end pt-4 gap-2">
                        <Button
                            variant="secondary"
                            onClick={onClose}
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
            </div>
        </div>
    );
}
