import { parse, isAfter, subDays } from 'date-fns';

const BCB_API_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json';
const CACHE_KEY = 'selic_cache';
const OVERRIDES_KEY = 'selic_overrides';
const CACHE_duration = 24 * 60 * 60 * 1000; // 24 hours

export const bcbService = {
    async fetchSelicRates() {
        // Check cache first
        let rates = [];
        const cached = localStorage.getItem(CACHE_KEY);

        if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_duration) {
                console.log('Returning cached SELIC rates');
                rates = data;
            }
        }

        if (rates.length === 0) {
            try {
                console.log('Fetching SELIC rates from BCB...');
                // Try direct fetch
                let response = await fetch(BCB_API_URL);

                // If CORS fails or other error, response might not be ok
                if (!response.ok) {
                    throw new Error('Direct fetch failed');
                }

                rates = await response.json();
                this._saveCache(rates);
            } catch (error) {
                console.warn('Direct fetch failed, trying proxy...', error);
                try {
                    // Fallback to allorigins proxy
                    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(BCB_API_URL)}`;
                    const response = await fetch(proxyUrl);
                    if (!response.ok) throw new Error('Proxy fetch failed');

                    rates = await response.json();
                    this._saveCache(rates);
                } catch (proxyError) {
                    console.error('All fetch attempts failed', proxyError);
                    // Return empty if completely failed, overrides will still apply
                    rates = [];
                }
            }
        }

        // Apply Overrides and Additions
        return this._applyOverrides(rates);
    },

    _saveCache(data) {
        if (!data) return;
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data
        }));
    },

    _getOverrides() {
        const stored = localStorage.getItem(OVERRIDES_KEY);
        return stored ? JSON.parse(stored) : {}; // Object { "DD/MM/YYYY": "0.50" }
    },

    _applyOverrides(rates) {
        if (!Array.isArray(rates)) {
            rates = [];
        }

        const overrides = this._getOverrides();
        const rateMap = new Map();

        // Index existing rates
        rates.forEach(r => {
            if (r && r.data) rateMap.set(r.data, { ...r, isOverridden: false, source: 'OFFICIAL' });
        });

        // Apply overrides (update existing or add new)
        Object.entries(overrides).forEach(([date, entry]) => {
            // Handle legacy format (string) vs new format (object)
            const value = typeof entry === 'object' ? entry.value : entry;
            const source = typeof entry === 'object' ? entry.source : 'MANUAL';

            rateMap.set(date, { data: date, valor: value, isOverridden: true, source });
        });

        // Convert back to array
        return Array.from(rateMap.values());
    },

    saveOverride(date, value, source = 'MANUAL') {
        const overrides = this._getOverrides();
        overrides[date] = { value, source };
        localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
        console.log("Saved override for", date, value, source);
    },

    // Helper to get rate for a specific month (MM/YYYY)
    findRate(rates, monthYearStr) {
        return rates.find(r => r?.data?.includes(monthYearStr));
    },

    removeOverride(date) {
        const overrides = this._getOverrides();
        if (overrides[date]) {
            delete overrides[date];
            localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
            console.log("Removed override for", date);
        }
    },

    // Fetch specific rate for MM/YYYY from BCB Series 4390 (Monthly Accumulated)
    async fetchRateForMonth(month, year) {
        try {
            // Series 4390 is "Taxa de juros - Selic acumulada no mês % a.m."
            // Query range: 1st of month to End of month
            const lastDay = new Date(year, month, 0).getDate();
            const startDate = `01/${month}/${year}`;
            const endDate = `${lastDay}/${month}/${year}`;

            const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`;

            let response;
            try {
                response = await fetch(url);
                if (!response.ok) throw new Error('Direct fetch failed');
            } catch (e) {
                // Proxy fallback
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                response = await fetch(proxyUrl);
            }

            if (!response.ok) throw new Error('BCB API Unavailable');

            const data = await response.json();
            // Expected: [{ data: "01/MM/YYYY", valor: "0.89" }] or similar

            if (data && data.length > 0) {
                return data[0].valor;
            }

            return null;
        } catch (error) {
            console.error("Error searching BCB for month:", month, year, error);
            throw error;
        }
    }
};
