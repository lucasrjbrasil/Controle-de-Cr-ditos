import { Fragment, useState } from 'react';
import { Landmark, ChevronDown, ChevronUp, Calendar, Percent, CreditCard, Pencil, Trash2, History } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { formatCurrencyByCode } from '../../../utils/formatters';
import Button from '../../../components/ui/Button';
import ResizableTh from '../../../components/ui/ResizableTh';
import LoanEvolutionTable from './LoanEvolutionTable';
import { useColumnResize } from '../../../hooks/useColumnResize';

export default function LoansTable({
    loans,
    companies,
    expandedId,
    setExpandedId,
    onEdit,
    onDelete,
    onAddPayment,
    onEditPayment,
    onRemovePayment,
    getLoanSnapshot,
    onCreateNew
}) {
    const [detailTab, setDetailTab] = useState('entries');
    const { handleResize, getColumnWidth } = useColumnResize({
        expand: 50,
        empresa: 200,
        instituicao: 200,
        moeda: 100,
        taxa: 150,
        saldo: 150,
        modified_by: 180,
        actions: 120
    });

    const toggleExpand = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    if (loans.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px]">
                <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Landmark size={32} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <p>Nenhum empréstimo encontrado.</p>
                    {onCreateNew && (
                        <Button variant="link" onClick={onCreateNew} className="mt-2">
                            Adicionar agora
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                        <tr>
                            <ResizableTh width={getColumnWidth('expand')} onResize={(w) => handleResize('expand', w)} className="px-6 py-4 font-semibold w-12"></ResizableTh>
                            <ResizableTh width={getColumnWidth('empresa')} onResize={(w) => handleResize('empresa', w)} className="px-6 py-4 font-semibold">Empresa</ResizableTh>
                            <ResizableTh width={getColumnWidth('instituicao')} onResize={(w) => handleResize('instituicao', w)} className="px-6 py-4 font-semibold">Instituição / Contraparte</ResizableTh>
                            <ResizableTh width={getColumnWidth('moeda')} onResize={(w) => handleResize('moeda', w)} className="px-6 py-4 font-semibold">Moeda</ResizableTh>
                            <ResizableTh width={getColumnWidth('taxa')} onResize={(w) => handleResize('taxa', w)} className="px-6 py-4 font-semibold">Taxa / Juros</ResizableTh>
                            <ResizableTh width={getColumnWidth('saldo')} onResize={(w) => handleResize('saldo', w)} className="px-6 py-4 font-semibold text-right">
                                <div className="w-full text-right">Saldo Devedor</div>
                            </ResizableTh>
                            <ResizableTh width={getColumnWidth('modified_by')} onResize={(w) => handleResize('modified_by', w)} className="px-6 py-4 font-semibold">Modificado por:</ResizableTh>
                            <ResizableTh width={getColumnWidth('actions')} onResize={(w) => handleResize('actions', w)} className="px-6 py-4 font-semibold text-center">
                                <div className="w-full text-center">Ações</div>
                            </ResizableTh>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {loans.map((loan) => {
                            const { balanceOrg, balanceBrl, isLiquidated } = getLoanSnapshot(loan.id);

                            return (
                                <Fragment key={loan.id}>
                                    <tr className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${expandedId === loan.id ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <Button
                                                variant="ghost"
                                                size="iconSm"
                                                onClick={() => toggleExpand(loan.id)}
                                                className="text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                            >
                                                {expandedId === loan.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </Button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-700 dark:text-slate-300">
                                                {companies.find(c => c.id === loan.empresaId)?.name || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                                                    <Landmark size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-800 dark:text-white">
                                                        {loan.instituicao}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`text-[10px] uppercase tracking-wider font-bold ${loan.categoria === 'Ativo' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                            {loan.categoria}
                                                        </div>
                                                        {isLiquidated && (
                                                            <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                                                                Liquidado
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{loan.moeda}</span>
                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {(() => {
                                                        try {
                                                            return loan.dataInicio ? format(parseISO(loan.dataInicio), 'dd/MM/yyyy') : 'N/A';
                                                        } catch (e) {
                                                            return 'Data Inválida';
                                                        }
                                                    })()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            <div className="flex flex-col">
                                                <span className="flex items-center gap-1">
                                                    <Percent size={14} className="text-slate-400" />
                                                    {loan.taxa}% {loan.periodoTaxa}
                                                </span>
                                                <span className="text-xs text-slate-400">Juros {loan.tipoJuros}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={`font-bold ${isLiquidated ? 'text-slate-400' : 'text-slate-800 dark:text-white'} text-lg`}>
                                                    {formatCurrencyByCode(balanceOrg, loan.moeda)}
                                                </span>
                                                {loan.moeda !== 'BRL' && (
                                                    <span className={`text-xs font-medium ${isLiquidated ? 'text-slate-400 bg-slate-100 dark:bg-slate-800' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'} px-1.5 py-0.5 rounded`}>
                                                        ≈ {formatCurrencyByCode(balanceBrl, 'BRL')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-xs">{loan.modified_by || 'N/A'}</span>
                                                {loan.modified_at && (
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                        {new Date(loan.modified_at).toLocaleDateString('pt-BR')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="iconSm"
                                                    onClick={() => onAddPayment(loan.id)}
                                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                                    title="Adicionar Pagamento"
                                                >
                                                    <CreditCard size={18} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="iconSm"
                                                    onClick={() => onEdit(loan)}
                                                    className="text-slate-500 hover:text-blue-600"
                                                    title="Editar"
                                                >
                                                    <Pencil size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="iconSm"
                                                    onClick={() => onDelete(loan.id)}
                                                    className="text-slate-500 hover:text-red-500"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                    {
                                        expandedId === loan.id && (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-6 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 shadow-inner">
                                                    <div className="flex items-center gap-4 mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">
                                                        <button
                                                            onClick={() => setDetailTab('entries')}
                                                            className={`pb-2 px-1 text-sm font-bold uppercase tracking-wider transition-all relative ${detailTab === 'entries' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                        >
                                                            Lançamentos
                                                            {detailTab === 'entries' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>}
                                                        </button>
                                                        <button
                                                            onClick={() => setDetailTab('evolution')}
                                                            className={`pb-2 px-1 text-sm font-bold uppercase tracking-wider transition-all relative ${detailTab === 'evolution' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                        >
                                                            Demonstrativo
                                                            {detailTab === 'evolution' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>}
                                                        </button>
                                                    </div>

                                                    {detailTab === 'entries' ? (
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-4 text-slate-500">
                                                                <History size={16} />
                                                                <h4 className="text-xs font-bold uppercase tracking-wider">Histórico de Lançamentos</h4>
                                                            </div>

                                                            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                                                <table className="w-full text-sm text-left">
                                                                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                                                                        <tr>
                                                                            <th className="px-4 py-2">Data</th>
                                                                            <th className="px-4 py-2">Tipo</th>
                                                                            <th className="px-4 py-2">Valor</th>
                                                                            <th className="px-4 py-2 text-center">Ações</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                                                                        {(() => {
                                                                            const initialEntry = (loan.valorOriginal && loan.valorOriginal > 0) ? {
                                                                                id: 'initial_entry',
                                                                                data: loan.dataInicio,
                                                                                tipo: 'INITIAL',
                                                                                valor: loan.valorOriginal
                                                                            } : null;

                                                                            const allTransactions = [
                                                                                ...(initialEntry ? [initialEntry] : []),
                                                                                ...(loan.payments || [])
                                                                            ].sort((a, b) => new Date(a.data) - new Date(b.data));

                                                                            if (allTransactions.length === 0) {
                                                                                return (
                                                                                    <tr>
                                                                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                                                                            Nenhum lançamento registrado.
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            }

                                                                            return allTransactions.map((payment) => (
                                                                                <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                                                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                                                                                        {isValid(parseISO(payment.data)) ? format(parseISO(payment.data), 'dd/MM/yyyy') : 'Data Inválida'}
                                                                                    </td>
                                                                                    <td className="px-4 py-2">
                                                                                        {payment.tipo === 'INITIAL' ? (
                                                                                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                                                                                                Aporte Inicial
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${payment.tipo === 'ADDITION' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                                                                                {payment.tipo === 'ADDITION' ? 'Novo Aporte' : 'Pagamento'}
                                                                                            </span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 font-medium">
                                                                                        <div className="flex flex-col">
                                                                                            <span className={
                                                                                                payment.tipo === 'INITIAL' ? 'text-violet-600 dark:text-violet-400' :
                                                                                                    payment.tipo === 'ADDITION' ? 'text-blue-600 dark:text-blue-400' :
                                                                                                        'text-emerald-600 dark:text-emerald-400'
                                                                                            }>
                                                                                                {payment.tipo === 'PAYMENT' ? '-' : '+'} {formatCurrencyByCode(payment.valor, loan.moeda)}
                                                                                            </span>
                                                                                            {payment.tipo === 'PAYMENT' && payment.valorJuros > 0 && (
                                                                                                <span className="text-[10px] text-slate-400">
                                                                                                    P: {formatCurrencyByCode(payment.valorPrincipal, loan.moeda)} | J: {formatCurrencyByCode(payment.valorJuros, loan.moeda)}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="px-4 py-2">
                                                                                        {payment.tipo !== 'INITIAL' && (
                                                                                            <div className="flex items-center justify-center gap-2">
                                                                                                <button
                                                                                                    onClick={() => onEditPayment(loan.id, payment)}
                                                                                                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                                                                                    title="Editar"
                                                                                                >
                                                                                                    <Pencil size={14} />
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => onRemovePayment(loan.id, payment.id)}
                                                                                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                                                                    title="Excluir"
                                                                                                >
                                                                                                    <Trash2 size={14} />
                                                                                                </button>
                                                                                            </div>
                                                                                        )}
                                                                                    </td>
                                                                                </tr>
                                                                            ));
                                                                        })()}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <LoanEvolutionTable loan={loan} />
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    }
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


