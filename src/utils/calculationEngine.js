import { addMonths, format, startOfMonth, differenceInMonths, parseISO, isSameMonth } from 'date-fns';

/**
 * Calculates the evolution of a tax credit following RFB/Sicalc methodology.
 * 
 * Rules:
 * 1. Accumulation starts from the first day of the month subsequent to origin.
 * 2. The month of "payment" (the reference month in each row) always receives +1.00% fixed.
 * 3. All months between (Origin + 1) and (Payment - 1) sum real Selic rates.
 * 4. Simple interest accumulation (soma).
 * 
 * @param {Object} credit - Credit object { valorPrincipal, dataArrecadacao, compensations: [{ date, value }] }
 * @param {Array} selicRates - Array of Selic rates [{ data: "DD/MM/YYYY", valor: "0.12" }]
 * @returns {Array} rows - Array of calculated month data
 */
export function calculateEvolution(credit, selicRates) {
    const startDate = startOfMonth(parseISO(credit.dataArrecadacao));
    const today = startOfMonth(new Date());

    if (isNaN(startDate.getTime())) return [];

    const rows = [];
    let currentPrincipal = typeof credit.valorPrincipal === 'number'
        ? credit.valorPrincipal
        : parseFloat(String(credit.valorPrincipal).replace(/\./g, '').replace(',', '.')) || 0;

    const monthCount = differenceInMonths(today, startDate) + 1;

    // Correctly map rates using MM/YYYY as key
    const ratesMap = new Map();
    selicRates.forEach(r => {
        if (!r?.data) return;
        const parts = r.data.split('/');
        if (parts.length === 3) {
            const key = `${parts[1]}/${parts[2]}`; // MM/YYYY
            const val = r.valor;
            const numericVal = typeof val === 'object' && val !== null ? parseFloat(val.buy || val.sell) : parseFloat(val);
            ratesMap.set(key, numericVal);
        }
    });

    let runningSelicSum = 0;

    for (let i = 0; i < monthCount; i++) {
        const currentMonthDate = addMonths(startDate, i);
        const monthStr = format(currentMonthDate, 'MM/yyyy');

        let accumulatedRate = 0;
        let monthlyRateForDisplay = 0;

        if (i === 0) {
            // Month of Origin: 0%
            accumulatedRate = 0;
            monthlyRateForDisplay = 0;
        } else if (i === 1) {
            // First month after origin: 1% flat
            accumulatedRate = 1.0;
            monthlyRateForDisplay = 1.0;
        } else {
            // Subsequent months: Sum of real Selic from (Origin + 1) up to (Current - 1) + 1.0% (for current)
            const prevMonthDate = addMonths(startDate, i - 1);
            const prevMonthStr = format(prevMonthDate, 'MM/yyyy');
            const prevRate = ratesMap.get(prevMonthStr) || 0;
            runningSelicSum += prevRate;

            accumulatedRate = runningSelicSum + 1.0;
            // The "incremental" rate for this row relative to the previous one is the Selic of the previous month
            monthlyRateForDisplay = prevRate;
        }

        const factor = 1 + (accumulatedRate / 100);
        const valorAtualizado = currentPrincipal * factor;

        // Compensation lookup
        const compObj = (credit.compensations || []).find(c =>
            isSameMonth(parseISO(c.date), currentMonthDate)
        );
        const compensation = compObj?.value || 0;

        const compensationPrincipal = factor !== 0 ? compensation / factor : 0;
        const compensationUpdate = compensation - compensationPrincipal;
        const saldoFinal = valorAtualizado - compensation;
        const monthlyUpdateValue = currentPrincipal * (accumulatedRate / 100);

        rows.push({
            id: monthStr,
            date: currentMonthDate,
            monthLabel: monthStr,
            principalBase: currentPrincipal,
            monthlyRate: monthlyRateForDisplay,
            accumulatedRate,
            factor,
            valorAtualizado,
            monthlyUpdateValue,
            compensation,
            compensationPrincipal,
            compensationUpdate,
            saldoFinal
        });

        if (compensation !== 0) {
            currentPrincipal = saldoFinal / factor;
        }
    }

    return rows;
}
