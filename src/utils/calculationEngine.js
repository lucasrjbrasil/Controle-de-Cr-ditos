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
        const monthlyUpdateOnly = currentPrincipal * (monthlyRateForDisplay / 100);

        rows.push({
            id: monthStr,
            date: currentMonthDate,
            monthLabel: monthStr,
            principalBase: currentPrincipal,
            monthlyRate: monthlyRateForDisplay,
            accumulatedRate,
            factor,
            valorAtualizado,
            monthlyUpdateValue, // Renamed to "Selic Acumulada" in UI
            monthlyUpdateOnly,  // New "Atualização" column
            compensation,
            compensationsList: compObj?.items || [], // Pass detailed list
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

/**
 * Calculates the amortization schedule for a tax installment (Federal Style - PERT/REFIS).
 * 
 * Rules:
 * 1. Basic Installment = Consolidated Value / Term.
 * 2. This Basic Installment is composed of Principal, Fine, and Interest proportionally.
 * 3. Interest (Selic Payment) = Balance (of Principal + Fine + Interest) * (Accumulated Selic from Consolidation + 1 to Payment Month).
 *    Wait, Federal Rule usually says:
 *    Value of Installment = (Consolidated Debt / Term) + Interest on (Consolidated Debt / Term).
 *    Usually, the Interest is:
 *    - 1% in the month of payment.
 *    - Accumulated Selic from (Consolidation + 1) up to (Payment - 1).
 *    This rate applies to the BASIC INSTALLMENT value being paid in that month.
 * 
 * @param {Object} installment - { valorOriginal, valor_principal, valor_multa, valor_juros, prazo, dataInicio }
 * @param {Array} selicRates - Array of Selic rates
 * @returns {Array} rows - Schedule
 */
export function calculateInstallmentEvolution(installment, selicRates) {
    const startDate = parseISO(installment.dataInicio);
    if (isNaN(startDate.getTime())) return [];

    const rows = [];
    const term = parseInt(installment.prazo) || 1;

    // Total Consolidated
    const totalConsolidated = parseFloat(installment.valorOriginal) || 0;

    // Breakdown Components
    const principalTotal = parseFloat(installment.valor_principal) || 0;
    const fineTotal = parseFloat(installment.valor_multa) || 0;
    const interestTotal = parseFloat(installment.valor_juros) || 0; // This is the interest INSIDE the consolidated debt

    // If components are not set (e.g. legacy data), treat all as principal or just work with total
    // But for the visualization requested, we try to split if total matches sum.
    // If mismatch or zeros, establish ratios based on Total.

    const sumComponents = principalTotal + fineTotal + interestTotal;

    // Ratios
    let ratioPrincipal = 0;
    let ratioFine = 0;
    let ratioInterest = 0;

    if (totalConsolidated > 0) {
        if (sumComponents > 0) {
            ratioPrincipal = principalTotal / sumComponents;
            ratioFine = fineTotal / sumComponents;
            ratioInterest = interestTotal / sumComponents;
        } else {
            // Default to all principal if breakdown missing
            ratioPrincipal = 1;
        }
    }

    const basicInstallmentTotal = totalConsolidated / term;

    // Breakdown of the BASIC INSTALLMENT (amortization part)
    const basicPrincipal = basicInstallmentTotal * ratioPrincipal;
    const basicFine = basicInstallmentTotal * ratioFine;
    const basicInterest = basicInstallmentTotal * ratioInterest;

    // Map rates for easy lookup
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
    let currentBalance = totalConsolidated;

    for (let i = 0; i < term; i++) {
        const paymentDate = addMonths(startDate, i);
        const paymentMonthStr = format(paymentDate, 'MM/yyyy');

        let accumulatedRate = 0;
        let monthlyRate = 0;

        if (i === 0) {
            // Standard federal rule: For payment in the month of consolidation: 1%
            accumulatedRate = 1.0;
            monthlyRate = 1.0;
        } else {
            const prevMonthDate = addMonths(startDate, i - 1);
            const prevMonthStr = format(prevMonthDate, 'MM/yyyy');
            const prevRate = ratesMap.get(prevMonthStr) || 0;

            runningSelicSum += prevRate;
            accumulatedRate = runningSelicSum + 1.0;
            monthlyRate = prevRate;
        }

        // The Selic Interest covers the "Update" of the value being paid.
        // It applies to the whole Basic Installment of the month.
        const selicInterestAmount = basicInstallmentTotal * (accumulatedRate / 100);

        const totalValue = basicInstallmentTotal + selicInterestAmount;

        const endingBalance = Math.max(0, currentBalance - basicInstallmentTotal);

        rows.push({
            number: i + 1,
            date: paymentDate,
            monthLabel: paymentMonthStr,

            // Composition of the Basic Installment (Amortization)
            amortizedPrincipal: basicPrincipal,
            amortizedFine: basicFine,
            amortizedInterest: basicInterest,

            // The "New" Interest (Selic Update)
            selicUpdateAmount: selicInterestAmount,

            // Legacy compatible fields
            principalAmount: basicInstallmentTotal,
            accumulatedRate,
            monthlyRate,
            interestAmount: selicInterestAmount,
            totalAmount: totalValue,
            balance: endingBalance
        });

        currentBalance = endingBalance;
    }

    return rows;
}
