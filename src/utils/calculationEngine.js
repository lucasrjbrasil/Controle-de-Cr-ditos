import { addMonths, format, startOfMonth, differenceInMonths, parseISO, isSameMonth } from 'date-fns';

/**
 * Calculates the evolution of a tax credit.
 * 
 * @param {Object} credit - Credit object { valorPrincipal, dataArrecadacao, compensations: [{ date, value }] }
 * @param {Array} selicRates - Array of Selic rates [{ data: "DD/MM/YYYY", valor: "0.12" }]
 * @returns {Array} rows - Array of calculated month data
 */
export function calculateEvolution(credit, selicRates) {
    const startDate = startOfMonth(parseISO(credit.dataArrecadacao));
    const today = startOfMonth(new Date());

    // Guard clause if date is invalid
    if (isNaN(startDate.getTime())) return [];

    const rows = [];
    // Ensure principal is a number, handling strings with commas
    let currentPrincipal = typeof credit.valorPrincipal === 'number'
        ? credit.valorPrincipal
        : parseFloat(String(credit.valorPrincipal).replace(/\./g, '').replace(',', '.')) || 0;

    let accumulatedRate = 0;

    // If we are in the future relative to start (or same month)
    // We iterate until today (or maybe +1 year if user wants projection? sticking to today for now)
    const monthCount = differenceInMonths(today, startDate) + 1;

    for (let i = 0; i < monthCount; i++) {
        const currentMonthDate = addMonths(startDate, i);
        const monthStr = format(currentMonthDate, 'MM/yyyy');

        let monthlyRate = 0;

        if (i === 0) {
            // Month 0: 0%
            monthlyRate = 0;
        } else if (i === 1) {
            // Month 1: 1% (User Rule)
            monthlyRate = 1.0;
        } else {
            // Month 2+: Selic
            // Find rate for this month
            // Format in API is often DD/MM/YYYY, usually day 01
            // We need to match MM/YYYY
            const rateObj = selicRates.find(r => {
                // r.data is DD/MM/YYYY
                // Check if Month and Year match
                return r?.data?.includes(monthStr); // Simple string check for 'MM/yyyy'
            });

            if (rateObj) {
                monthlyRate = parseFloat(rateObj.valor);
            } else {
                // If not found (e.g. current month not released yet), assume 0 or last known?
                // Usually 0 until released.
                monthlyRate = 0;
            }
        }

        // Accumulate
        accumulatedRate += monthlyRate;

        // Factor uses simple sum (Juros Simples / Sistema Selic standard)
        // Factor = 1 + (Sum / 100)
        const factor = 1 + (accumulatedRate / 100);

        // Calculate values
        const valorAtualizado = currentPrincipal * factor;

        // Check for compensations in this month
        // We assume compensation is stored as logic inside the row for now, 
        // or passed in 'credit.compensations'.
        // We need to find compensation for this specific month.
        // Assuming credit.compensations is array of { monthIndex: x, value: y } or similar.
        // Or date based.

        // For the dynamic table, we might just store compensations in a Map <MonthKey, Value>
        // We'll calculate it on the fly.
        const compObj = (credit.compensations || []).find(c =>
            isSameMonth(parseISO(c.date), currentMonthDate)
        );

        const compensation = compObj?.value || 0;

        // Back-calculate Principal: P_comp = Compensation / Factor
        // Factor = 1 + (AccumulatedRate / 100)
        // This assumes the compensation value entered IS the "Updated Value" (Principal + Interest)
        const compensationPrincipal = factor !== 0 ? compensation / factor : 0;

        const compensationUpdate = compensation - compensationPrincipal;

        // Saldo Final Logic:
        // We subtract the Full Compensation from the Updated Value.
        // This is mathematically equivalent to subtracting P_comp from the Principal.
        // V_updated - C = (P * F) - (P_comp * F) = F * (P - P_comp)
        const saldoFinal = valorAtualizado - compensation;

        // Calculate the specific momentary value added by THIS month's rate
        // Since V = P * (1 + sumR), DeltaV = P * r_month
        const monthlyUpdateValue = currentPrincipal * (monthlyRate / 100);

        rows.push({
            id: monthStr, // unique key
            date: currentMonthDate,
            monthLabel: monthStr,
            principalBase: currentPrincipal, // Saldo Original Remanescente
            monthlyRate,
            accumulatedRate,
            factor,
            valorAtualizado,
            monthlyUpdateValue, // Atualização
            compensation,
            compensationPrincipal,
            compensationUpdate,
            saldoFinal
        });

        // If there was compensation, adjust the PRINCIPAL for next iterations
        // Rebase Principal: The remaining value (saldoFinal) represents the new principal * currentFactor?
        // NO. If we are using Simple Interest, "eating" the principal means:
        // P_new * Factor = SaldoFinal
        // P_new = SaldoFinal / Factor
        // This effectively removes the portion of Principal (and its future interest) that was paid.
        if (compensation !== 0) {
            currentPrincipal = saldoFinal / factor;
        }
    }

    return rows;
}
