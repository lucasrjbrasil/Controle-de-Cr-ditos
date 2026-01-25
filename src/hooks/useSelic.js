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

    const updateRate = (date, newValue, source = 'MANUAL') => {
        const normalizedDate = bcbService._normalizeDate(date);

        // Ensure rates is array
        const currentRates = Array.isArray(rates) ? rates : [];

        // Check if exists
        const exists = currentRates.some(r => r.data === normalizedDate);

        if (exists) {
            setRates(prev => (Array.isArray(prev) ? prev : []).map(r =>
                r.data === normalizedDate ? { ...r, valor: newValue, isOverridden: true, source } : r
            ));
        } else {
            // Add new
            setRates(prev => {
                const updated = [...(Array.isArray(prev) ? prev : []), { data: normalizedDate, valor: newValue, isOverridden: true, source }];
                // Sort by date
                return updated.sort((a, b) => {
                    const [da, ma, ya] = a.data.split('/').map(Number);
                    const [db, mb, yb] = b.data.split('/').map(Number);
                    return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
                });
            });
        }

        // Persist
        bcbService.saveOverride(normalizedDate, newValue, source);
    };

    const batchUpdateRates = (updates) => {
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

            // Sort by date
            return [...currentRates].sort((a, b) => {
                const [da, ma, ya] = a.data.split('/').map(Number);
                const [db, mb, yb] = b.data.split('/').map(Number);
                return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
            });
        });

        // Persist (normalization inside bcbService will handle storage too)
        bcbService.saveOverridesBatch(updates);
    };

    const removeRate = async (date) => {
        try {
            // Remove override from storage
            bcbService.removeOverride(date);

            // Re-fetch to restore original state (or remove if it was purely local)
            setLoading(true);
            const data = await bcbService.fetchSelicRates();
            setRates(data);

            // Update last updated if needed
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
