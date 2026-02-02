import { formatCurrency } from '../../../utils/formatters';

export default function CreditsSummaryCard({ totalBalance, competencyDate, filteredCount }) {
    return (
        <div className="bg-gradient-to-br from-irko-blue via-[#004a8d] to-irko-orange/80 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <p className="text-blue-100/80 text-sm font-medium mb-1">Saldo Total Disponível ({competencyDate.split('-').reverse().join('/')})</p>
                    <h3 className="text-4xl font-bold">{formatCurrency(totalBalance)}</h3>
                </div>
                <div className="text-right">
                    <p className="text-white/60 text-xs">Considerando {filteredCount} créditos filtrados</p>
                </div>
            </div>
        </div>
    );
}


