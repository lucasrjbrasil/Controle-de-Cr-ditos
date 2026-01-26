import React, { useState } from 'react';
import { CreditCard, X, Save, AlertCircle } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import { useLoans } from '../context/LoanContext';

export default function LoanPaymentForm({ loanId, onClose, initialData = null }) {
    const { addPayment, updatePayment } = useLoans();
    const [formData, setFormData] = useState({
        data: initialData?.data || new Date().toISOString().slice(0, 10),
        valorPrincipal: initialData?.valorPrincipal || initialData?.valor || '',
        valorJuros: initialData?.valorJuros || '',
        taxa: initialData?.taxa || '1',
        tipo: initialData?.tipo || 'PAYMENT', // PAYMENT or ADDITION
    });
    const [error, setError] = useState(null);

    const isEditing = !!initialData;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError(null);
    };

    const valorPrincipal = parseFloat(formData.valorPrincipal || 0);
    const valorJuros = parseFloat(formData.valorJuros || 0);
    const totalOriginal = valorPrincipal + valorJuros;
    const valorBrl = (totalOriginal * parseFloat(formData.taxa || 0)).toFixed(2);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.valorPrincipal || !formData.data) {
            setError('Preencha pelo menos o valor principal e a data.');
            return;
        }

        try {
            const payload = {
                ...formData,
                valorPrincipal: parseFloat(formData.valorPrincipal || 0),
                valorJuros: parseFloat(formData.valorJuros || 0),
                valor: totalOriginal, // For compatibility/display
                taxa: parseFloat(formData.taxa),
                valorBrl: parseFloat(valorBrl)
            };

            if (isEditing) {
                updatePayment(loanId, initialData.id, payload);
            } else {
                addPayment(loanId, payload);
            }
            onClose();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <CreditCard size={20} className="text-emerald-600" />
                        {isEditing ? 'Editar Lançamento' : 'Novo Lançamento'}
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-red-500 transition-colors">
                        <X size={20} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, tipo: 'PAYMENT' }))}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${formData.tipo === 'PAYMENT' ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Pagamento (Saída)
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, tipo: 'ADDITION' }))}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${formData.tipo === 'ADDITION' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Novo Aporte (Entrada)
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Data do Pagamento</label>
                        <Input
                            type="date"
                            name="data"
                            value={formData.data}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                {formData.tipo === 'PAYMENT' ? 'Valor Principal' : 'Valor do Aporte'}
                            </label>
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

                        {formData.tipo === 'PAYMENT' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Juros Pagos</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    name="valorJuros"
                                    value={formData.valorJuros}
                                    onChange={handleChange}
                                    placeholder="0,00"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Taxa de Pagamento</label>
                            <Input
                                type="number"
                                step="any"
                                name="taxa"
                                value={formData.taxa}
                                onChange={handleChange}
                                placeholder="1.00"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Taxa de Conversão</label>
                            <div className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-mono flex items-center h-10">
                                R$ {valorBrl}
                            </div>
                        </div>
                    </div>



                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Save size={18} />
                            Salvar Lançamento
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
