import { Fragment } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import EvolutionTable from './EvolutionTable';
import ErrorBoundary from '../../../components/ErrorBoundary';
import Button from '../../../components/ui/Button';
import ResizableTh from '../../../components/ui/ResizableTh';
import { useColumnResize } from '../../../hooks/useColumnResize';

export default function CreditsTable({
    credits,
    expandedId,
    competencyDate,
    perdcomps,
    onEdit,
    onDelete,
    onToggleDetails,
    onGetBalance,
    onCreateNew
}) {
    const { handleResize, getColumnWidth } = useColumnResize({
        id: 80,
        empresa: 250,
        periodo: 100,
        codigo: 100,
        tipo: 100,
        valor: 150,
        saldo: 150,
        restituicao: 150,
        modified_by: 180,
        actions: 120
    });

    if (credits.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px]">
                <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Plus size={32} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <p>Nenhum crédito encontrado.</p>
                    {onCreateNew && (
                        <Button variant="link" onClick={onCreateNew} className="mt-2">
                            Criar novo
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
                    {/* Header */}
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                        <tr>
                            <ResizableTh width={getColumnWidth('id')} onResize={(w) => handleResize('id', w)} className="px-6 py-4 font-semibold">ID</ResizableTh>
                            <ResizableTh width={getColumnWidth('empresa')} onResize={(w) => handleResize('empresa', w)} className="px-6 py-4 font-semibold">Empresa</ResizableTh>
                            <ResizableTh width={getColumnWidth('periodo')} onResize={(w) => handleResize('periodo', w)} className="px-6 py-4 font-semibold">Período</ResizableTh>
                            <ResizableTh width={getColumnWidth('codigo')} onResize={(w) => handleResize('codigo', w)} className="px-6 py-4 font-semibold">Código</ResizableTh>
                            <ResizableTh width={getColumnWidth('tipo')} onResize={(w) => handleResize('tipo', w)} className="px-6 py-4 font-semibold">Tipo</ResizableTh>
                            <ResizableTh width={getColumnWidth('valor')} onResize={(w) => handleResize('valor', w)} className="px-6 py-4 font-semibold text-right">
                                <div className="w-full text-right">Valor Original</div>
                            </ResizableTh>
                            <ResizableTh width={getColumnWidth('saldo')} onResize={(w) => handleResize('saldo', w)} className="px-6 py-4 font-semibold text-right">
                                <div className="w-full text-right">
                                    Saldo em {competencyDate ? competencyDate.split('-').reverse().join('/') : 'Atualmente'}
                                </div>
                            </ResizableTh>
                            <ResizableTh width={getColumnWidth('restituicao')} onResize={(w) => handleResize('restituicao', w)} className="px-6 py-4 font-semibold">Pedido Restituição</ResizableTh>
                            <ResizableTh width={getColumnWidth('modified_by')} onResize={(w) => handleResize('modified_by', w)} className="px-6 py-4 font-semibold">Modificado por</ResizableTh>
                            <ResizableTh width={getColumnWidth('actions')} onResize={(w) => handleResize('actions', w)} className="px-6 py-4 font-semibold text-center">
                                <div className="w-full text-center">Ações</div>
                            </ResizableTh>
                        </tr>
                    </thead>

                    {/* Body */}
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {credits.map((credit) => {
                            const balanceInfo = onGetBalance(credit);
                            return (
                                <Fragment key={credit.id}>
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                                            #{credit.id.toString().slice(-4)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800 dark:text-white">{credit.empresa}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{credit.periodoApuracao}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono text-sm">{credit.codigoReceita}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-medium">
                                                {credit.tipoCredito}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                                            {formatCurrency(credit.valorPrincipal)}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold ${balanceInfo.value === 0 ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            {formatCurrency(balanceInfo.value)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-xs font-mono">
                                            {(() => {
                                                const linked = perdcomps.find(p => p.creditId === credit.id && p.isRestituicao);
                                                return linked ? linked.numero : '-';
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{credit.modified_by || 'N/A'}</span>
                                                {credit.modified_at && (
                                                    <span className="text-xs text-slate-400 dark:text-slate-500">
                                                        {new Date(credit.modified_at).toLocaleDateString('pt-BR')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="iconSm"
                                                    onClick={() => onEdit(credit)}
                                                    className="text-slate-500 hover:text-irko-blue"
                                                    title="Editar"
                                                >
                                                    <Pencil size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="iconSm"
                                                    onClick={() => onDelete(credit.id)}
                                                    className="text-slate-500 hover:text-red-500"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    onClick={() => onToggleDetails(credit.id)}
                                                    className="ml-2"
                                                >
                                                    {expandedId === credit.id ? 'Ocultar' : 'Detalhes'}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedId === credit.id && (
                                        <tr>
                                            <td colSpan={10} className="px-6 py-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 shadow-inner">
                                                <ErrorBoundary>
                                                    <EvolutionTable credit={credit} />
                                                </ErrorBoundary>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


