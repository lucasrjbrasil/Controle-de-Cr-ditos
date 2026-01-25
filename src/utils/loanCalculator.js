import { addDays, addMonths, format, startOfMonth, differenceInDays, parseISO, isSameMonth, eachDayOfInterval, isSameDay, isLastDayOfMonth } from 'date-fns';
import Decimal from 'decimal.js';

/**
 * Calculates the evolution of a loan with DAILY granularity, aggregated by periods.
 * 
 * @param {Object} loan - Loan object
 * @param {Array} exchangeRates - Array of exchange rates
 * @param {Date} [cutoffDate=new Date()] - Optional end date for calculation
 * @returns {Array} rows - Array of calculated month data
 */
export function calculateLoanEvolution(loan, exchangeRates, cutoffDate = new Date()) {
    const start = parseISO(loan.dataInicio);
    const end = cutoffDate;

    if (isNaN(start.getTime())) return [];
    if (end < start) return [];

    // Create a map for easy exchange rate lookup
    const rateMap = new Map();
    exchangeRates.forEach(r => {
        rateMap.set(r.data, r.valor);
    });

    // Daily rate calculation with high precision
    const baseRate = new Decimal(loan.taxa || 0).div(100);
    const yearBase = parseInt(loan.baseCalculo || '360');
    let dailyRate;

    if (loan.tipoJuros === 'Composto') {
        const daysInPeriod = loan.periodoTaxa === 'Anual' ? yearBase : 30;
        // Nominal Rate Logic: Simple Division
        // This allows capitalization periodicity to affect the final yield (Daily > Monthly > Annual)
        dailyRate = baseRate.div(daysInPeriod);
    } else {
        const daysInPeriod = loan.periodoTaxa === 'Anual' ? yearBase : 30;
        // Formula: dailyRate = baseRate / daysInPeriod
        dailyRate = baseRate.div(daysInPeriod);
    }

    // Convert back to regular number for the loop iterations to keep it simple, 
    // but the starting value is now more precise.
    const dailyRateNum = dailyRate.toNumber();

    const dailyInterval = eachDayOfInterval({ start, end });

    let principalOrg = loan.valorOriginal || 0;
    let interestOrg = 0; // This will track ACCRUED but NOT YET CAPITALIZED interest
    let capitalizedInterest = 0; // This will track the component of principal that came from interest
    let lastExchangeRateObj = { buy: parseFloat(loan.taxaCambio) || 1.0, sell: parseFloat(loan.taxaCambio) || 1.0 };

    const monthlyData = [];
    let currentMonth = null;
    let monthStats = null;

    // Calculation Buffers (consolidated interest/variation to be flushed on payments or month-end)
    let bufferFlowInterestOrg = 0;
    let bufferFlowActiveVarPrinc = 0;
    let bufferFlowPassiveVarPrinc = 0;
    let bufferFlowActiveVarInt = 0;
    let bufferFlowPassiveVarInt = 0;
    let bufferFlowInterestBrl = 0;

    dailyInterval.forEach((day, index) => {
        const monthStr = format(day, 'MM/yyyy');
        const dayStr = format(day, 'dd/MM/yyyy');

        // 1. Get Transactions and potential Manual Rate for today
        const todaysTransactions = (loan.payments || []).filter(p => isSameDay(parseISO(p.data), day));
        const manualRate = todaysTransactions.find(p => p.taxa)?.taxa;

        // 2. Get Exchange Rate for today
        const isFirstDay = index === 0;
        let todayRateObj = rateMap.get(dayStr) || lastExchangeRateObj;
        const type = loan.categoria === 'Ativo' ? 'buy' : 'sell';

        // Priority: Manual Rate (Movement) > First Day (loan.taxaCambio) > Market Rate
        let todayRate;
        if (manualRate) {
            todayRate = parseFloat(manualRate);
            todayRateObj = { buy: todayRate, sell: todayRate };
        } else if (isFirstDay && loan.taxaCambio) {
            todayRate = parseFloat(loan.taxaCambio);
            todayRateObj = { buy: todayRate, sell: todayRate };
        } else {
            todayRate = parseFloat(todayRateObj[type]) || parseFloat(todayRateObj.buy) || 1.0;
        }

        const prevRate = parseFloat(lastExchangeRateObj[type]) || parseFloat(lastExchangeRateObj.buy) || 1.0;

        // 3. Logic: Interest and Variation
        let dailyDeltaIntOrg = 0;
        let dailyVarPrinc = 0;
        let dailyVarInt = 0;

        if (!isFirstDay && (principalOrg > 0 || interestOrg > 0)) {
            if (loan.tipoJuros === 'Composto') {
                const cap = loan.periodicidadeCapitalizacao || 'Mensal';
                if (cap === 'Diária') {
                    // Daily: Base is Principal + Total Accrued Interest
                    dailyDeltaIntOrg = (principalOrg + interestOrg) * dailyRateNum;
                } else {
                    // Monthly/Annual: Base is Principal + Capitalized Portion ONLY
                    dailyDeltaIntOrg = (principalOrg + capitalizedInterest) * dailyRateNum;
                }
            } else {
                dailyDeltaIntOrg = principalOrg * dailyRateNum;
            }
        }

        if (!isFirstDay) {
            // Variation still calculated if there is a balance and it's not the first day
            if (principalOrg !== 0) {
                dailyVarPrinc = principalOrg * (todayRate - prevRate);
            }
            if (interestOrg !== 0) {
                dailyVarInt = interestOrg * (todayRate - prevRate);
            }
        }

        // 4. Accumulate into buffers
        bufferFlowInterestOrg += dailyDeltaIntOrg;
        bufferFlowInterestBrl += (dailyDeltaIntOrg * todayRate);

        if (loan.categoria === 'Ativo') {
            if (dailyVarPrinc > 0) bufferFlowActiveVarPrinc += dailyVarPrinc;
            else bufferFlowPassiveVarPrinc += Math.abs(dailyVarPrinc);

            if (dailyVarInt > 0) bufferFlowActiveVarInt += dailyVarInt;
            else bufferFlowPassiveVarInt += Math.abs(dailyVarInt);
        } else {
            if (dailyVarPrinc > 0) bufferFlowPassiveVarPrinc += dailyVarPrinc;
            else bufferFlowActiveVarPrinc += Math.abs(dailyVarPrinc);

            if (dailyVarInt > 0) bufferFlowPassiveVarInt += dailyVarInt;
            else bufferFlowActiveVarInt += Math.abs(dailyVarInt);
        }

        // 5. Handle Transactions for today
        const hasTransactions = todaysTransactions.length > 0;
        const additions = todaysTransactions.filter(p => p.tipo === 'ADDITION');
        const payments = todaysTransactions.filter(p => p.tipo !== 'ADDITION');

        // Respect explicit split if available
        const totalAddedToday = additions.reduce((acc, p) => acc + (p.valorPrincipal || p.valor || 0), 0);
        const totalPaidPrincipal = payments.reduce((acc, p) => acc + (p.valorPrincipal || p.valor || 0), 0);
        const totalPaidInterest = payments.reduce((acc, p) => acc + (p.valorJuros || 0), 0);
        const totalPaidToday = totalPaidPrincipal + totalPaidInterest;

        const hasAddition = additions.length > 0;
        const hasPayment = payments.length > 0;
        const isMonthEnd = isLastDayOfMonth(day);

        // 5. Monthly Stats Initialization / Monthly Data Management
        if (currentMonth !== monthStr) {
            if (monthStats) {
                monthlyData.push(monthStats);
            }
            currentMonth = monthStr;
            monthStats = {
                monthLabel: monthStr,
                date: startOfMonth(day),
                exchangeRate: todayRate,
                principalOrg: principalOrg, // Start of Month Balance
                interestOrg: interestOrg,
                monthlyInterestOrg: 0,
                totalPaidOrg: 0,
                variationPrincipal: 0,
                variationInterest: 0,
                activeVarPrincipal: 0,
                passiveVarPrincipal: 0,
                activeVarInterest: 0,
                passiveVarInterest: 0,
                monthlyInterestBrl: 0,
                totalBrl: 0,
                dailyLogs: []
            };
        }

        // 6. Handle Trigger for Logging
        // Log if: First Day OR Transactions OR Month End
        const shouldLogRow = isFirstDay || hasTransactions || isMonthEnd;

        // Apply rules for what to show on the log row
        let loggedIntOrg = 0;
        let loggedActiveVarPrinc = 0;
        let loggedPassiveVarPrinc = 0;
        let loggedActiveVarInt = 0;
        let loggedPassiveVarInt = 0;
        let loggedIntBrl = 0;

        // Rule: Only show consolidated buffers on Payments or Month-End.
        // Aportes (Addition only) and First Day show 0 flow (buffers continue for Aportes).
        const shouldFlushBuffers = !isFirstDay && (hasPayment || isMonthEnd);

        if (shouldFlushBuffers) {
            loggedIntOrg = bufferFlowInterestOrg;
            loggedActiveVarPrinc = bufferFlowActiveVarPrinc;
            loggedPassiveVarPrinc = bufferFlowPassiveVarPrinc;
            loggedActiveVarInt = bufferFlowActiveVarInt;
            loggedPassiveVarInt = bufferFlowPassiveVarInt;
            loggedIntBrl = bufferFlowInterestBrl;

            // Reset buffers after flushing
            bufferFlowInterestOrg = 0;
            bufferFlowActiveVarPrinc = 0;
            bufferFlowPassiveVarPrinc = 0;
            bufferFlowActiveVarInt = 0;
            bufferFlowPassiveVarInt = 0;
            bufferFlowInterestBrl = 0;
        }

        // 4.5. Capitalization Event Logic
        // Determine if interest should be capitalized (added to principal) today
        let shouldCapitalize = false;
        const cap = loan.periodicidadeCapitalizacao || 'Mensal';

        if (loan.tipoJuros === 'Composto') {
            if (cap === 'Diária') {
                shouldCapitalize = true;
            } else if (cap === 'Mensal' && isMonthEnd) {
                shouldCapitalize = true;
            } else if (cap === 'Anual' && isMonthEnd && day.getMonth() === 11) { // Dec 31
                shouldCapitalize = true;
            }
        }

        // Apply Flows to principal
        principalOrg += totalAddedToday;

        let endInterestOrg = interestOrg + dailyDeltaIntOrg - totalPaidInterest;
        let endPrincipalOrg = principalOrg - totalPaidPrincipal;

        if (shouldCapitalize && endInterestOrg > 0) {
            // INCORRECT: endPrincipalOrg += endInterestOrg; // Don't merge into display principal
            // CORRECT: Update the internal capitalized base
            capitalizedInterest = endInterestOrg;
        }

        // Safety: If interest was paid, capitalized base cannot exceed total interest
        if (capitalizedInterest > endInterestOrg) {
            capitalizedInterest = endInterestOrg;
        }

        let netPrincipalFlow = totalAddedToday - totalPaidPrincipal;

        if (isFirstDay) {
            netPrincipalFlow += loan.valorOriginal || 0;
        }

        // Update Month Stats (Accumulate for the whole month view)
        monthStats.monthlyInterestOrg += dailyDeltaIntOrg;
        monthStats.monthlyInterestBrl += (dailyDeltaIntOrg * todayRate);
        monthStats.totalPaidOrg += totalPaidToday;
        monthStats.activeVarPrincipal += (loan.categoria === 'Ativo' ? (dailyVarPrinc > 0 ? dailyVarPrinc : 0) : (dailyVarPrinc < 0 ? Math.abs(dailyVarPrinc) : 0));
        monthStats.passiveVarPrincipal += (loan.categoria === 'Ativo' ? (dailyVarPrinc < 0 ? Math.abs(dailyVarPrinc) : 0) : (dailyVarPrinc > 0 ? dailyVarPrinc : 0));
        monthStats.activeVarInterest += (loan.categoria === 'Ativo' ? (dailyVarInt > 0 ? dailyVarInt : 0) : (dailyVarInt < 0 ? Math.abs(dailyVarInt) : 0));
        monthStats.passiveVarInterest += (loan.categoria === 'Ativo' ? (dailyVarInt < 0 ? Math.abs(dailyVarInt) : 0) : (dailyVarInt > 0 ? dailyVarInt : 0));
        monthStats.exchangeRate = todayRate;
        monthStats.finalPrincipalOrg = endPrincipalOrg;
        monthStats.finalInterestOrg = endInterestOrg;
        monthStats.totalBrl = (endPrincipalOrg + endInterestOrg) * todayRate;
        monthStats.principalBrl = endPrincipalOrg * todayRate;
        monthStats.interestBrl = endInterestOrg * todayRate;

        if (shouldLogRow) {
            const logEntry = {
                date: dayStr,
                rate: todayRate,
                dailyInterest: loggedIntOrg,
                principalFlow: netPrincipalFlow,
                activeVarPrincipal: loggedActiveVarPrinc,
                passiveVarPrincipal: loggedPassiveVarPrinc,
                activeVarInterest: loggedActiveVarInt,
                passiveVarInterest: loggedPassiveVarInt,
                dailyInterestBrl: loggedIntBrl,
                principalOrg: endPrincipalOrg,
                interestOrgAcc: endInterestOrg,
                paidToday: totalPaidToday,
                totalBrl: (endPrincipalOrg + endInterestOrg) * todayRate,
                principalBrl: endPrincipalOrg * todayRate,
                interestBrl: endInterestOrg * todayRate
            };
            monthStats.dailyLogs.push(logEntry);
        }

        // State update for next day
        interestOrg = endInterestOrg;
        principalOrg = endPrincipalOrg;
        lastExchangeRateObj = todayRateObj;
    });

    if (monthStats) {
        monthlyData.push(monthStats);
    }

    return monthlyData;
}
