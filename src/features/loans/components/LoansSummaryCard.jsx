import { formatCurrency } from '../../../utils/formatters';

export default function LoansSummaryCard({ totalLoanValue, filteredCount }) {
    return (
        <div className="bg-gradient-to-br from-irko-blue via-[#004a8d] to-irko-orange/80 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">Saldo Devedor Total (Principal Estimado em BRL)</p>
                    <h3 className="text-4xl font-bold">{formatCurrency(totalLoanValue)}</h3>
                </div>
                <div className="text-right">
                    <p className="text-blue-200 text-xs">{filteredCount} contratos ativos</p>
                </div>
            </div>
        </div>
    );
}


