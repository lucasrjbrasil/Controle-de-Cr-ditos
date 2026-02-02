import { useMemo, useCallback } from 'react';
import { calculateEvolution } from '../utils/calculationEngine';

export function useCreditBalances(credits, perdcomps, rates, competencyDate) {
    // Memoized helper to calculate balance - now returns a function that uses cached data
    const calculateBalanceForCredit = useCallback((credit, referenceDate) => {
        if (!referenceDate) return { value: 0, isFuture: false };

        try {
            const creditPerdcomps = perdcomps.filter(p => p.creditId === credit.id);
            const monthlyCompensations = [];
            creditPerdcomps.forEach(p => {
                const date = p.dataCriacao;
                const valStr = p.valorCompensado;
                const value = typeof valStr === 'number' ? valStr : Number(valStr.replace(/[^0-9,-]+/g, "").replace(",", "."));

                const existingIndex = monthlyCompensations.findIndex(c => c.date.substring(0, 7) === date.substring(0, 7));
                if (existingIndex >= 0) monthlyCompensations[existingIndex].value += value;
                else monthlyCompensations.push({ date, value });
            });

            const effectiveCredit = { ...credit, compensations: monthlyCompensations };
            const evolution = calculateEvolution(effectiveCredit, rates);

            const [year, month] = referenceDate.split('-');
            const targetLabel = `${month}/${year}`;

            const row = evolution.find(r => r.monthLabel === targetLabel);
            if (row) return { value: row.saldoFinal, isFuture: false };

            const firstRow = evolution[0];
            if (firstRow && referenceDate < firstRow.date.toISOString().slice(0, 7)) {
                return { value: 0, isFuture: true };
            }

            const lastRow = evolution[evolution.length - 1];
            if (lastRow) return { value: lastRow.saldoFinal, isFuture: false };

            return { value: 0, isFuture: false };
        } catch (e) {
            return { value: 0, isFuture: false };
        }
    }, [perdcomps, rates]);

    // Pre-calculate all balances once using useMemo - this is the key optimization
    const balanceCache = useMemo(() => {
        const cache = new Map();
        credits.forEach(credit => {
            cache.set(credit.id, calculateBalanceForCredit(credit, competencyDate));
        });
        return cache;
    }, [credits, competencyDate, calculateBalanceForCredit]);

    // Helper function that uses the cache
    const getBalanceAtCompetency = useCallback((credit, referenceDate = competencyDate) => {
        // If using default competencyDate, use cached value
        if (referenceDate === competencyDate && balanceCache.has(credit.id)) {
            return balanceCache.get(credit.id);
        }
        // Otherwise calculate on demand (for export with different date)
        return calculateBalanceForCredit(credit, referenceDate);
    }, [competencyDate, balanceCache, calculateBalanceForCredit]);

    // Use cached balances for total - no recalculation needed
    const totalBalance = useMemo(() => {
        return credits.reduce((acc, credit) => {
            const cached = balanceCache.get(credit.id);
            return acc + (cached?.value || 0);
        }, 0);
    }, [credits, balanceCache]);

    return {
        getBalanceAtCompetency,
        totalBalance,
        balanceCache
    };
}
