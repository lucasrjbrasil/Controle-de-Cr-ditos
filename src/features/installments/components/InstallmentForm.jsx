import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useInstallment } from '../../../context/InstallmentContext';
import { useCompanies } from '../../../context/CompanyContext';
import { formatCurrency, parseCurrency } from '../../../utils/formatters';

export default function InstallmentForm({ onClose, initialData = null }) {
    const { addInstallment, updateInstallment } = useInstallment();
    const { companies } = useCompanies();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        empresaId: '',
        numeroProcesso: '',
        categoria: '', // Programa (PERT, REFIS, etc)
        dataInicio: '', // Data Consolidação
        valorOriginal: 0,
        valorPrincipal: 0,
        valorMulta: 0,
        valorJuros: 0,
        prazo: 0,
        tipoJuros: 'SELIC', // Default
        status: 'Ativo'
    });

    const [displayValues, setDisplayValues] = useState({
        valorOriginal: '',
        valorPrincipal: '',
        valorMulta: '',
        valorJuros: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                empresaId: initialData.empresaId || '',
                numeroProcesso: initialData.numeroProcesso || '',
                categoria: initialData.categoria || '',
                dataInicio: initialData.dataInicio || '',
                valorOriginal: initialData.valorOriginal || 0,
                valorPrincipal: initialData.valor_principal || 0,
                valorMulta: initialData.valor_multa || 0,
                valorJuros: initialData.valor_juros || 0,
                prazo: initialData.prazo || 0,
                tipoJuros: initialData.tipoJuros || 'SELIC',
                status: initialData.status || 'Ativo'
            });
            setDisplayValues({
                valorOriginal: formatCurrency(initialData.valorOriginal),
                valorPrincipal: formatCurrency(initialData.valor_principal || 0),
                valorMulta: formatCurrency(initialData.valor_multa || 0),
                valorJuros: formatCurrency(initialData.valor_juros || 0)
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCurrencyChange = (e, field) => {
        const value = e.target.value;
        setDisplayValues(prev => ({ ...prev, [field]: value }));
        setFormData(prev => ({ ...prev, [field]: parseCurrency(value) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!formData.empresaId) throw new Error("Selecione uma empresa.");
            if (!formData.numeroProcesso) throw new Error("Informe o número do processo.");
            if (!formData.valorOriginal || formData.valorOriginal <= 0) throw new Error("Valor original inválido.");

            // Map to database columns (snake_case)
            const payload = {
                ...formData,
                valor_principal: formData.valorPrincipal,
                valor_multa: formData.valorMulta,
                valor_juros: formData.valorJuros
            };

            // Remove camelCase keys if strict, but Supabase ignores extra keys usually? 
            // Better to be clean.
            delete payload.valorPrincipal;
            delete payload.valorMulta;
            delete payload.valorJuros;

            if (initialData?.id) {
                await updateInstallment(initialData.id, payload);
            } else {
                await addInstallment(payload);
            }
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        {initialData ? 'Editar Parcelamento' : 'Novo Parcelamento'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 flex-1">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
                            <AlertCircle size={20} className="flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <form id="installment-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Empresa */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Empresa <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="empresaId"
                                    value={formData.empresaId}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-irko-blue outline-none transition-all"
                                    required
                                >
                                    <option value="">Selecione uma empresa...</option>
                                    {companies.map(company => (
                                        <option key={company.id} value={company.id}>
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Número do Processo */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Número do Processo <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    name="numeroProcesso"
                                    value={formData.numeroProcesso}
                                    onChange={handleChange}
                                    placeholder="Ex: 12345.678901/2023-00"
                                    required
                                />
                            </div>

                            {/* Programa / Categoria */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Programa / Modalidade
                                </label>
                                <Input
                                    name="categoria"
                                    value={formData.categoria}
                                    onChange={handleChange}
                                    placeholder="Ex: PERT, Lei 12.345..."
                                />
                            </div>

                            {/* Data Consolidação */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Data de Consolidação
                                </label>
                                <Input
                                    type="date"
                                    name="dataInicio"
                                    value={formData.dataInicio}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Values Breakdown */}
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="md:col-span-3 text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                    Composição da Dívida Consolidada
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Principal
                                    </label>
                                    <Input
                                        value={displayValues.valorPrincipal}
                                        onChange={(e) => handleCurrencyChange(e, 'valorPrincipal')}
                                        placeholder="R$ 0,00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Multa
                                    </label>
                                    <Input
                                        value={displayValues.valorMulta}
                                        onChange={(e) => handleCurrencyChange(e, 'valorMulta')}
                                        placeholder="R$ 0,00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Juros (Consolidados)
                                    </label>
                                    <Input
                                        value={displayValues.valorJuros}
                                        onChange={(e) => handleCurrencyChange(e, 'valorJuros')}
                                        placeholder="R$ 0,00"
                                    />
                                </div>
                                <div className="md:col-span-3 text-xs text-right text-slate-500">
                                    Total Calculado: {formatCurrency((formData.valorPrincipal || 0) + (formData.valorMulta || 0) + (formData.valorJuros || 0))}
                                    {(formData.valorPrincipal || 0) + (formData.valorMulta || 0) + (formData.valorJuros || 0) !== formData.valorOriginal && (
                                        <span className="text-orange-500 ml-2 font-medium">
                                            (Diferente do Total Consolidado)
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Valor Original */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Valor Consolidado Total <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    value={displayValues.valorOriginal}
                                    onChange={(e) => handleCurrencyChange(e, 'valorOriginal')}
                                    placeholder="R$ 0,00"
                                    required
                                />
                            </div>

                            {/* Prazo (Meses) */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Prazo (Quantidade de Parcelas)
                                </label>
                                <Input
                                    type="number"
                                    name="prazo"
                                    value={formData.prazo}
                                    onChange={handleChange}
                                    placeholder="Ex: 60"
                                    min="1"
                                />
                            </div>

                            {/* Tipo de Juros */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Índice de Correção
                                </label>
                                <select
                                    name="tipoJuros"
                                    value={formData.tipoJuros}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-irko-blue outline-none transition-all"
                                >
                                    <option value="SELIC">SELIC (Padrão Federal)</option>
                                    <option value="FIXO">Taxa Fixa</option>
                                    <option value="OUTRO">Outro Índice</option>
                                </select>
                            </div>

                            {/* Status */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-irko-blue outline-none transition-all"
                                >
                                    <option value="Ativo">Ativo</option>
                                    <option value="Liquidado">Liquidado</option>
                                    <option value="Rescindido">Rescindido</option>
                                    <option value="Suspenso">Suspenso</option>
                                </select>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900 z-10">
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="installment-form" loading={loading} className="gap-2">
                        <Save size={20} />
                        Salvar Parcelamento
                    </Button>
                </div>
            </div>
        </div>
    );
}


