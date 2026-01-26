import { useState, useEffect } from 'react';
import { bcbService } from '../services/bcbService';

export function useSelic() {
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                setLoading(true);
                const data = await bcbService.fetchSelicRates();

                if (mounted) {
                    setRates(data);
                    setIsConnected(true);

                    // Get the date of the last rate
                    if (data.length > 0) {
                        const lastRate = data[data.length - 1];
                        setLastUpdated(lastRate.data);
                    }
                }
            } catch (err) {
                if (mounted) {
                    setError(err.message);
                    setIsConnected(false);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, []);

    const updateRate = async (date, newValue, source = 'MANUAL') => {
        try {
            const normalizedDate = bcbService._normalizeDate(date);
            await bcbService.saveOverride(normalizedDate, newValue, source);

            setRates(prev => {
                const currentRates = Array.isArray(prev) ? prev : [];
                const exists = currentRates.some(r => r.data === normalizedDate);
                let updated;
                if (exists) {
                    updated = currentRates.map(r =>
                        r.data === normalizedDate ? { ...r, valor: newValue, isOverridden: true, source } : r
                    );
                } else {
                    updated = [...currentRates, { data: normalizedDate, valor: newValue, isOverridden: true, source }];
                }
                return updated.sort((a, b) => {
                    const [da, ma, ya] = a.data.split('/').map(Number);
                    const [db, mb, yb] = b.data.split('/').map(Number);
                    return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
                });
            });
        } catch (err) {
            console.error("Error updating rate:", err);
            setError(err.message);
        }
    };

    const batchUpdateRates = async (updates) => {
        try {
            await bcbService.saveOverridesBatch(updates);

            setRates(prev => {
                const currentRates = Array.isArray(prev) ? [...prev] : [];
                const normalizedUpdates = updates.map(u => ({ ...u, date: bcbService._normalizeDate(u.date) }));

                normalizedUpdates.forEach(update => {
                    const index = currentRates.findIndex(r => r.data === update.date);
                    if (index !== -1) {
                        currentRates[index] = { ...currentRates[index], valor: update.value, isOverridden: true, source: update.source || 'BCB' };
                    } else {
                        currentRates.push({ data: update.date, valor: update.value, isOverridden: true, source: update.source || 'BCB' });
                    }
                });

                return [...currentRates].sort((a, b) => {
                    const [da, ma, ya] = a.data.split('/').map(Number);
                    const [db, mb, yb] = b.data.split('/').map(Number);
                    return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
                });
            });
        } catch (err) {
            console.error("Error batch updating rates:", err);
            setError(err.message);
        }
    };

    const removeRate = async (date) => {
        try {
            setLoading(true);
            await bcbService.removeOverride(date);

            const data = await bcbService.fetchSelicRates();
            setRates(data);

            if (data.length > 0) {
                const lastRate = data[data.length - 1];
                setLastUpdated(lastRate.data);
            }
        } catch (err) {
            console.error("Error removing rate:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return { rates, loading, error, lastUpdated, isConnected, updateRate, removeRate, batchUpdateRates };
}
