import React, { useState, useMemo } from 'react';
import { Landmark, X, Save, AlertCircle, Info } from 'lucide-react';
import { useLoans } from '../context/LoanContext';
import { useCompanies } from '../context/CompanyContext';
import Button from './ui/Button';
import Input from './ui/Input';

const LabelWithTooltip = ({ label, tooltip }) => (
    <div className="flex items-center gap-2 group relative w-fit">
        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-help flex items-center gap-1">
            {label}
            <Info size={14} className="text-slate-400 hover:text-indigo-500 transition-colors" />
        </label>
        <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed border border-slate-700">
            {tooltip.split('\\n').map((line, i) => (
                <div key={i} className={i > 0 ? 'mt-1' : ''}>{line}</div>
            ))}
            <div className="absolute top-full left-3 -mt-1 border-4 border-transparent border-t-slate-800"></div>
        </div>
    </div>
);

export default function LoanForm({ onClose, initialData = null }) {
    const { addLoan, updateLoan } = useLoans();
    const { companies } = useCompanies();
    const [formData, setFormData] = useState({
        empresaId: initialData?.empresaId || '',
        instituicao: initialData?.instituicao || '',
        categoria: initialData?.categoria || 'Passivo',
        moeda: initialData?.moeda || 'BRL',
        taxaCambio: initialData?.taxaCambio || '1.00',
        tipoJuros: initialData?.tipoJuros || 'Composto',
        dataInicio: initialData?.dataInicio || '',
        valorOriginal: initialData?.valorOriginal || '',
        taxa: initialData?.taxa || '',
        periodoTaxa: initialData?.periodoTaxa || 'Mensal',
        baseCalculo: initialData?.baseCalculo || '360',
        periodicidadeCapitalizacao: initialData?.periodicidadeCapitalizacao || 'Mensal',
        prazo: initialData?.prazo || '',
    });
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const newState = { ...prev, [name]: value };
            // If currency changed to BRL, reset exchange rate
            if (name === 'moeda' && value === 'BRL') {
                newState.taxaCambio = '1.00';
            }
            return newState;
        });
        setError(null);
    };

    const valorEmReal = useMemo(() => {
        const original = parseFloat(formData.valorOriginal) || 0;
        const cambio = parseFloat(formData.taxaCambio) || 1;
        return (original * cambio).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, [formData.valorOriginal, formData.taxaCambio]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.empresaId || !formData.instituicao || !formData.valorOriginal || !formData.dataInicio) {
            setError('Preencha todos os campos obrigatórios, incluindo a empresa.');
            return;
        }

        try {
            const dataToSave = {
                ...formData,
                valorOriginal: parseFloat(formData.valorOriginal),
                taxaCambio: parseFloat(formData.taxaCambio),
                taxa: parseFloat(formData.taxa),
                prazo: formData.prazo ? parseInt(formData.prazo) : null,
            };

            if (initialData && initialData.id) {
                updateLoan(initialData.id, dataToSave);
            } else {
                addLoan(dataToSave);
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
                        <Landmark size={20} className="text-indigo-600" />
                        {initialData ? 'Editar Empréstimo' : 'Novo Empréstimo'}
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
                                name="empresaId"
                                value={formData.empresaId}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                required
                            >
                                <option value="">Selecione uma empresa...</option>
                                {companies.map(company => (
                                    <option key={company.id} value={company.id}>
                                        {company.name} ({company.cnpj})
                                    </option>
                                ))}
                            </select>
                            {companies.length === 0 && (
                                <p className="text-[10px] text-red-500 italic">
                                    Nenhuma empresa cadastrada. Vá em "Empresas" primeiro.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Instituição Financeira / Contraparte</label>
                            <Input
                                name="instituicao"
                                value={formData.instituicao}
                                onChange={handleChange}
                                placeholder="Ex: Bradesco, Itaú, Fornecedor X..."
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Categoria</label>
                            <div className="flex gap-4 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="categoria"
                                        checked={formData.categoria === 'Ativo'}
                                        onChange={() => setFormData(prev => ({ ...prev, categoria: 'Ativo' }))}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Ativo</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="categoria"
                                        checked={formData.categoria === 'Passivo'}
                                        onChange={() => setFormData(prev => ({ ...prev, categoria: 'Passivo' }))}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Passivo</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Moeda</label>
                            <select
                                name="moeda"
                                value={formData.moeda}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                            >
                                <option value="BRL">Real (BRL)</option>
                                <option value="USD">Dólar (USD)</option>
                                <option value="EUR">Euro (EUR)</option>
                                <option value="GBP">Libra (GBP)</option>
                            </select>
                        </div>

                        {formData.moeda !== 'BRL' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Taxa de Câmbio (1 {formData.moeda} = X BRL)</label>
                                <Input
                                    type="number"
                                    step="0.0001"
                                    name="taxaCambio"
                                    value={formData.taxaCambio}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <LabelWithTooltip
                                label="Tipo de Juros"
                                tooltip="• Simples: A taxa incide apenas sobre o valor original. Não há juros sobre juros.\n• Composto: A taxa incide sobre o principal + juros acumulados. O rendimento cresce exponencialmente."
                            />
                            <div className="flex gap-4 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="tipoJuros"
                                        value="Simples"
                                        checked={formData.tipoJuros === 'Simples'}
                                        onChange={handleChange}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Simples</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="tipoJuros"
                                        value="Composto"
                                        checked={formData.tipoJuros === 'Composto'}
                                        onChange={handleChange}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Composto</span>
                                </label>
                            </div>
                        </div>

                        {formData.tipoJuros === 'Composto' && (
                            <div className="space-y-2">
                                <LabelWithTooltip
                                    label="Capitalização"
                                    tooltip="Define a frequência com que os juros são incorporados ao saldo.\n• Diária: Maior retorno (juros sobre juros todo dia).\n• Mensal: Padrão de mercado.\n• Anual: Juros incidem sobre juros a cada 12 meses.\n• No Vencimento: Juros só se integram ao final."
                                />
                                <select
                                    name="periodicidadeCapitalizacao"
                                    value={formData.periodicidadeCapitalizacao}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                >
                                    <option value="Diária">Diária</option>
                                    <option value="Mensal">Mensal</option>
                                    <option value="Anual">Anual</option>
                                    <option value="No Vencimento">No Vencimento</option>
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Data de Início</label>
                            <Input
                                type="date"
                                name="dataInicio"
                                value={formData.dataInicio}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Valor em Moeda Original</label>
                            <Input
                                type="number"
                                step="0.01"
                                name="valorOriginal"
                                value={formData.valorOriginal}
                                onChange={handleChange}
                                placeholder="0,00"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Valor em Real (BRL)</label>
                            <div className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold">
                                R$ {valorEmReal}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Taxa de Juros (%)</label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    step="0.001"
                                    name="taxa"
                                    value={formData.taxa}
                                    onChange={handleChange}
                                    placeholder="0,00"
                                    wrapperClassName="flex-1"
                                    required
                                />
                                <select
                                    name="periodoTaxa"
                                    value={formData.periodoTaxa}
                                    onChange={handleChange}
                                    className="w-32 px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                >
                                    <option>Mensal</option>
                                    <option>Anual</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Prazo (Meses)</label>
                            <Input
                                type="number"
                                name="prazo"
                                value={formData.prazo}
                                onChange={handleChange}
                                placeholder="Indeterminado (opcional)"
                            />
                        </div>

                        <div className="space-y-2">
                            <LabelWithTooltip
                                label="Base de Cálculo (Dias/Ano)"
                                tooltip="Define o divisor para a taxa diária.\n• 360 (Bancário/Comercial): Considera ano de 360 dias. Padrão de mercado.\n• 365 (Civil): Considera dias corridos reais do ano (365 ou 366)."
                            />
                            <select
                                name="baseCalculo"
                                value={formData.baseCalculo}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                            >
                                <option value="360">360 dias</option>
                                <option value="365">365 dias</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            <Save size={18} />
                            {initialData ? 'Atualizar' : 'Salvar Empréstimo'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
