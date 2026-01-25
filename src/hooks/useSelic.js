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
        // Ensure rates is array
        const currentRates = Array.isArray(rates) ? rates : [];

        // Check if exists
        const exists = currentRates.some(r => r.data === date);

        if (exists) {
            setRates(prev => (Array.isArray(prev) ? prev : []).map(r =>
                r.data === date ? { ...r, valor: newValue, isOverridden: true, source } : r
            ));
        } else {
            // Add new
            setRates(prev => [...(Array.isArray(prev) ? prev : []), { data: date, valor: newValue, isOverridden: true, source }]);
        }

        // Persist
        bcbService.saveOverride(date, newValue, source);
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

    return { rates, loading, error, lastUpdated, isConnected, updateRate, removeRate };
}
