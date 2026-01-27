import { useState, useEffect, useCallback } from 'react';
import { bcbService } from '../services/bcbService';

export function useOtherRates(selectedIndicatorId) {
    const [configs, setConfigs] = useState({});
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadConfigs = useCallback(async () => {
        try {
            const data = await bcbService.getIndicatorConfigs();
            setConfigs(data);
            return data;
        } catch (err) {
            console.error("Error loading indicator configs:", err);
            return {};
        }
    }, []);

    useEffect(() => {
        loadConfigs();
    }, [loadConfigs]);

    useEffect(() => {
        let mounted = true;

        async function loadRates() {
            if (!selectedIndicatorId) return;
            try {
                setLoading(true);
                const data = await bcbService.fetchIndicatorRates(selectedIndicatorId);

                if (mounted) {
                    setRates(data);
                    if (data.length > 0) {
                        const lastRate = data[data.length - 1];
                        setLastUpdated(lastRate.data);
                    }
                }
            } catch (err) {
                if (mounted) {
                    setError(err.message);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadRates();

        return () => {
            mounted = false;
        };
    }, [selectedIndicatorId]);

    const updateRate = async (date, newValue, source = 'MANUAL') => {
        try {
            const normalizedDate = bcbService._normalizeDate(date);
            await bcbService.saveIndicatorOverride(selectedIndicatorId, normalizedDate, newValue, source);

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
            for (const update of updates) {
                await bcbService.saveIndicatorOverride(selectedIndicatorId, update.date, update.value, update.source || 'BCB');
            }

            const data = await bcbService.fetchIndicatorRates(selectedIndicatorId);
            setRates(data);
        } catch (err) {
            console.error("Error batch updating rates:", err);
            setError(err.message);
        }
    };

    const removeRate = async (date) => {
        try {
            setLoading(true);
            await bcbService.removeIndicatorOverride(selectedIndicatorId, date);

            const data = await bcbService.fetchIndicatorRates(selectedIndicatorId);
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

    const addConfig = async (indicator, seriesId, label) => {
        await bcbService.addIndicatorConfig(indicator, seriesId, label);
        await loadConfigs();
    };

    const removeConfig = async (indicator) => {
        await bcbService.removeIndicatorConfig(indicator);
        await loadConfigs();
    };

    return {
        configs,
        rates,
        loading,
        error,
        lastUpdated,
        updateRate,
        removeRate,
        batchUpdateRates,
        addConfig,
        removeConfig,
        refreshConfigs: loadConfigs
    };
}
