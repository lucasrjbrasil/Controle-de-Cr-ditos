import { useState, useEffect } from 'react';
import { isValid, parseISO, endOfMonth, isBefore, format, isAfter } from 'date-fns';
import { bcbService } from '../services/bcbService';
import { calculateLoanEvolution } from '../utils/loanCalculator';

export function useLoanCalculations(loans, referenceMonth) {
    const [calculatedBalances, setCalculatedBalances] = useState({});
    const [loadingRates, setLoadingRates] = useState(false);

    useEffect(() => {
        const calculateAll = async () => {
            if (!referenceMonth) return;
            if (!/^\d{4}-\d{2}$/.test(referenceMonth)) return; // Safety check

            const refDate = endOfMonth(parseISO(referenceMonth + '-01'));
            if (!isValid(refDate)) return;

            setLoadingRates(true);

            try {
                // 1. Identify needed currencies and time range
                const currencies = [...new Set(loans.map(l => l.moeda).filter(c => c && c !== 'BRL'))];

                // Find global min start date to fetch enough history
                let minStart = refDate;
                loans.forEach(l => {
                    const s = new Date(l.dataInicio);
                    if (isValid(s) && isBefore(s, minStart)) minStart = s;
                });

                const ratesMap = {}; // { USD: [...] }

                // 2. Fetch Rates
                if (currencies.length > 0) {
                    await Promise.all(currencies.map(async (curr) => {
                        try {
                            if (!isValid(minStart)) return;
                            const startStr = format(minStart, 'dd/MM/yyyy');
                            const endStr = format(refDate, 'dd/MM/yyyy');
                            const history = await bcbService.fetchExchangeRatesWithHistory(curr, startStr, endStr);
                            ratesMap[curr] = history;
                        } catch (e) {
                            console.error(`Error loading rates for ${curr}`, e);
                            ratesMap[curr] = [];
                        }
                    }));
                }

                // 3. Calculate Evolution for each loan
                const balances = {};
                for (const loan of loans) {
                    try {
                        const loanStart = new Date(loan.dataInicio);
                        if (!isValid(loanStart)) {
                            balances[loan.id] = { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
                            continue;
                        }

                        if (isAfter(loanStart, refDate)) {
                            balances[loan.id] = { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
                            continue;
                        }

                        // Get rates for this loan's currency
                        const loanRates = loan.moeda === 'BRL' ? [] : (ratesMap[loan.moeda] || []);

                        // Calculate evolution up to reference date
                        const evolution = calculateLoanEvolution(loan, loanRates, refDate);

                        if (!evolution || evolution.length === 0) {
                            balances[loan.id] = { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
                            continue;
                        }

                        const lastMonth = evolution[evolution.length - 1];
                        const lastLog = lastMonth?.dailyLogs?.[lastMonth.dailyLogs.length - 1];

                        if (!lastLog) {
                            balances[loan.id] = { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
                            continue;
                        }

                        // Total Balance = Principal + Interest (Accumulated)
                        const totalBalanceOrg = (lastLog.principalOrg || 0) + (lastLog.interestOrgAcc || 0);
                        const totalBalanceBrl = lastLog.totalBrl || 0;
                        const rate = lastLog.rate || 1;

                        balances[loan.id] = {
                            balanceOrg: totalBalanceOrg,
                            balanceBrl: totalBalanceBrl,
                            isLiquidated: totalBalanceOrg <= 0.01,
                            rate
                        };
                    } catch (innerErr) {
                        console.error('Error calculating loan', loan.id, innerErr);
                        balances[loan.id] = { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
                    }
                }

                setCalculatedBalances(balances);
            } catch (err) {
                console.error("Critical error in calculateAll", err);
            } finally {
                setLoadingRates(false);
            }
        };

        calculateAll();
    }, [loans, referenceMonth]);

    const getLoanSnapshot = (loanId) => {
        return calculatedBalances[loanId] || { balanceOrg: 0, balanceBrl: 0, isLiquidated: false, rate: 1 };
    };

    return {
        calculatedBalances,
        getLoanSnapshot,
        loadingRates,
        setLoadingRates
    };
}
