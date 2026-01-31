import { useState, useEffect } from 'react';
import { bcbService } from '../services/bcbService';

export function useExchangeRates(currency, startDate = null, endDate = null) {
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!currency || currency === 'BRL') {
            setRates([]);
            setLoading(false);
            return;
        }

        let mounted = true;

        async function load() {
            try {
                setLoading(true);
                let data;
                if (startDate && endDate) {
                    data = await bcbService.fetchExchangeRatesWithHistory(currency, startDate, endDate);
                } else {
                    data = await bcbService.fetchExchangeRates(currency);
                }

                if (mounted) {
                    setRates(data);
                }
            } catch (err) {
                if (mounted) setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, [currency, startDate, endDate]);

    const updateRate = async (date, newValue, source = 'MANUAL') => {
        if (!currency) return;

        try {
            await bcbService.saveOverride(date, newValue, source, currency);

            const currentRates = Array.isArray(rates) ? rates : [];
            const exists = currentRates.some(r => r.data === date);

            if (exists) {
                setRates(prev => (Array.isArray(prev) ? prev : []).map(r =>
                    r.data === date ? { ...r, valor: newValue, isOverridden: true, source } : r
                ));
            } else {
                setRates(prev => [...(Array.isArray(prev) ? prev : []), { data: date, valor: newValue, isOverridden: true, source }]);
            }
        } catch (err) {
            console.error("Error updating exchange rate:", err);
            setError(err.message);
        }
    };

    const batchUpdateRates = async (updates) => {
        if (!currency) return;

        try {
            await bcbService.saveOverridesBatch(updates, currency);

            setRates(prev => {
                const currentRates = Array.isArray(prev) ? [...prev] : [];
                updates.forEach(update => {
                    const index = currentRates.findIndex(r => r.data === update.date);
                    if (index !== -1) {
                        currentRates[index] = { ...currentRates[index], valor: update.value, isOverridden: true, source: update.source || 'BCB' };
                    } else {
                        currentRates.push({ data: update.date, valor: update.value, isOverridden: true, source: update.source || 'BCB' });
                    }
                });
                return currentRates;
            });
        } catch (err) {
            console.error("Error batch updating exchange rates:", err);
            setError(err.message);
        }
    };

    const removeRate = async (date) => {
        if (!currency) return;

        try {
            setLoading(true);
            await bcbService.removeOverride(date, currency);
            const data = await bcbService.fetchExchangeRates(currency);
            setRates(data);
        } catch (err) {
            console.error("Error removing exchange rate:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return { rates, loading, error, updateRate, removeRate, batchUpdateRates };
}

