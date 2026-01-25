const BCB_SELIC_MONTH_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?formato=json';
const CACHE_KEY = 'selic_cache';
const OVERRIDES_KEY = 'selic_overrides';
const CURRENCIES_KEY = 'exchange_managed_currencies';
const CACHE_duration = 24 * 60 * 60 * 1000; // 24 hours
const HIST_CACHE_PREFIX = 'hist_exchange_';

const DEFAULT_CURRENCIES = {
    'USD': { buy: 10813, sell: 1 },
    'EUR': { buy: 21620, sell: 21619 },
    'GBP': { buy: 21624, sell: 21623 },
    'CAD': { buy: 21636, sell: 21635 },
    'JPY': { buy: 21622, sell: 21621 },
    'CHF': { buy: 21626, sell: 21625 }
};

export const COMMON_CODES = [
    { name: 'Dólar Americano', symbol: 'USD', buy: 10813, sell: 1 },
    { name: 'Euro', symbol: 'EUR', buy: 21620, sell: 21619 },
    { name: 'Iene Japonês', symbol: 'JPY', buy: 21622, sell: 21621 },
    { name: 'Libra Esterlina', symbol: 'GBP', buy: 21624, sell: 21623 },
    { name: 'Franco Suíço', symbol: 'CHF', buy: 21626, sell: 21625 },
    { name: 'Coroa Dinamarquesa', symbol: 'DKK', buy: 21628, sell: 21627 },
    { name: 'Coroa Norueguesa', symbol: 'NOK', buy: 21630, sell: 21629 },
    { name: 'Coroa Sueca', symbol: 'SEK', buy: 21632, sell: 21631 },
    { name: 'Dólar Australiano', symbol: 'AUD', buy: 21634, sell: 21633 },
    { name: 'Dólar Canadense', symbol: 'CAD', buy: 21636, sell: 21635 },
    { name: 'Coroa Tcheca', symbol: 'CZK', buy: 21638, sell: 21637 },
    { name: 'Dólar de Cingapura', symbol: 'SGD', buy: 21640, sell: 21639 },
    { name: 'Dólar de Hong Kong', symbol: 'HKD', buy: 21642, sell: 21641 },
    { name: 'Dólar Neozelandês', symbol: 'NZD', buy: 21644, sell: 21643 },
    { name: 'Peso Argentino', symbol: 'ARS', buy: 21646, sell: 21645 },
    { name: 'Peso Chileno', symbol: 'CLP', buy: 21648, sell: 21647 },
    { name: 'Peso Colombiano', symbol: 'COP', buy: 21650, sell: 21649 },
    { name: 'Peso Mexicano', symbol: 'MXN', buy: 21652, sell: 21651 },
    { name: 'Peso Uruguaio', symbol: 'UYU', buy: 21654, sell: 21653 },
    { name: 'Rand Sul-Africano', symbol: 'ZAR', buy: 21656, sell: 21655 },
    { name: 'Renminbi (Yuan)', symbol: 'CNY', buy: 21658, sell: 21657 },
    { name: 'Won Sul-Coreano', symbol: 'KRW', buy: 21660, sell: 21659 },
    { name: 'Zloty Polonês', symbol: 'PLN', buy: 21662, sell: 21661 },
    { name: 'Rublo Russo', symbol: 'RUB', buy: 21664, sell: 21663 },
    { name: 'Rupia Indiana', symbol: 'INR', buy: 21666, sell: 21665 },
    { name: 'Ringgit Malaio', symbol: 'MYR', buy: 21668, sell: 21667 },
    { name: 'Peso Filipino', symbol: 'PHP', buy: 21670, sell: 21669 },
    { name: 'Baht Tailandês', symbol: 'THB', buy: 21672, sell: 21671 },
    { name: 'Novo Shekel Israelense', symbol: 'ILS', buy: 21674, sell: 21673 },
    { name: 'Lira Turca', symbol: 'TRY', buy: 21676, sell: 21675 },
    { name: 'Forint Húngaro', symbol: 'HUF', buy: 21678, sell: 21677 },
    { name: 'Rupia Indonésia', symbol: 'IDR', buy: 21680, sell: 21679 },
    { name: 'Riyal Saudita', symbol: 'SAR', buy: 21682, sell: 21681 },
    { name: 'Dirham dos EAU', symbol: 'AED', buy: 21684, sell: 21683 },
    { name: 'Lev Búlgaro', symbol: 'BGN', buy: 21686, sell: 21685 }
];

export const bcbService = {
    // Helper to normalize BCB values (e.g. "0,89" -> "0.89")
    _normalizeValue(val) {
        if (typeof val === 'string') {
            return val.replace(',', '.');
        }
        return val;
    },

    // Helper to ensure DD/MM/YYYY format with leading zeros
    _normalizeDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.trim().split('/');

        let day, month, year;

        if (parts.length === 3) {
            // format DD/MM/YYYY
            day = parts[0].padStart(2, '0');
            month = parts[1].padStart(2, '0');
            year = parts[2];
        } else if (parts.length === 2) {
            // format MM/YYYY -> assume first day of month
            day = '01';
            month = parts[0].padStart(2, '0');
            year = parts[1];
        } else {
            return dateStr.trim();
        }

        return `${day}/${month}/${year}`;
    },

    async _robustFetch(url) {
        const timestamp = Date.now();
        const fetchOptions = { cache: 'no-store' };

        // 1. Try AllOrigins (First Priority - usually more transparent)
        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&disableCache=${timestamp}`;
            const response = await fetch(proxyUrl, fetchOptions);
            if (response.ok) return await response.json();
            console.warn(`AllOrigins proxy failed: ${response.status}`);
        } catch (e) {
            console.warn("AllOrigins proxy failed.", e);
        }

        // 2. Try CORSProxy.io
        try {
            const urlWithCache = url + `&_t=${timestamp}`;
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(urlWithCache)}`;
            const response = await fetch(proxyUrl, fetchOptions);
            if (response.ok) return await response.json();
            console.warn(`CORSProxy.io failed: ${response.status}`);
        } catch (e) {
            console.warn("CORSProxy.io failed.", e);
        }

        // 3. Try Direct (Last resort)
        try {
            const response = await fetch(url, fetchOptions);
            if (response.ok) return await response.json();
            console.warn(`Direct fetch failed: ${response.status}`);
        } catch (e) {
            console.warn("Direct fetch failed.", e);
        }

        throw new Error("Falha de conexão com o BCB (todas as tentativas falharam).");
    },

    getSeriesIds(currency) {
        const managed = this.getManagedCurrencies();
        const ids = managed[currency.toUpperCase()];
        if (!ids) return null;
        // Handle legacy single ID if any
        if (typeof ids === 'number') return { buy: ids, sell: ids + 1 };
        return ids;
    },

    getManagedCurrencies() {
        const stored = localStorage.getItem(CURRENCIES_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            let needsUpdate = false;

            // Robust Migration: Ensure all default currencies match verified IDs
            // This fixes issues where old/incorrect IDs were stored in localStorage
            Object.keys(DEFAULT_CURRENCIES).forEach(symbol => {
                const current = parsed[symbol];
                const expected = DEFAULT_CURRENCIES[symbol];

                if (!current || current.buy !== expected.buy || current.sell !== expected.sell) {
                    console.log(`Fixing currency config for ${symbol}: Resetting to verified IDs...`);
                    parsed[symbol] = expected;
                    needsUpdate = true;
                }
            });

            if (needsUpdate) {
                localStorage.setItem(CURRENCIES_KEY, JSON.stringify(parsed));
            }
            return parsed;
        }

        localStorage.setItem(CURRENCIES_KEY, JSON.stringify(DEFAULT_CURRENCIES));
        return DEFAULT_CURRENCIES;
    },

    clearHistoryCache(currency) {
        // Clear specific currency history cache
        const prefix = currency ? `${HIST_CACHE_PREFIX}${currency.toUpperCase()}_` : HIST_CACHE_PREFIX;
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(prefix)) {
                localStorage.removeItem(key);
            }
        });

        // Also clear general selic cache if no currency specified
        if (!currency) {
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem('selic_cache'); // legacy
        }
    },

    addManagedCurrency(symbol, buySeriesId, sellSeriesId) {
        const managed = this.getManagedCurrencies();
        managed[symbol.toUpperCase()] = {
            buy: parseInt(buySeriesId),
            sell: parseInt(sellSeriesId)
        };
        localStorage.setItem(CURRENCIES_KEY, JSON.stringify(managed));
    },

    removeManagedCurrency(symbol) {
        const managed = this.getManagedCurrencies();
        delete managed[symbol.toUpperCase()];
        localStorage.setItem(CURRENCIES_KEY, JSON.stringify(managed));
    },

    async fetchSelicRates() {
        let rates = [];
        const cached = localStorage.getItem(CACHE_KEY);

        if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_duration) {
                rates = data;
            }
        }

        if (rates.length === 0) {
            try {
                let response = await fetch(BCB_SELIC_MONTH_URL);
                if (!response.ok) throw new Error('Direct fetch failed');
                rates = await response.json();
                this._saveCache(rates);
            } catch (error) {
                try {
                    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(BCB_SELIC_MONTH_URL)}`;
                    const response = await fetch(proxyUrl);
                    if (!response.ok) throw new Error('Proxy fetch failed');
                    rates = await response.json();
                    this._saveCache(rates);
                } catch (proxyError) {
                    rates = [];
                }
            }
        }

        // Apply normalization to fetched rates
        if (!Array.isArray(rates)) {
            console.error('Expected rates to be an array but got:', typeof rates, rates);
            rates = [];
        }

        const normalizedRates = rates.map(r => ({
            ...r,
            valor: this._normalizeValue(r.valor)
        }));

        return this._applyOverrides(normalizedRates, OVERRIDES_KEY, false);
    },

    _saveCache(data, key = CACHE_KEY) {
        if (!data) return;
        localStorage.setItem(key, JSON.stringify({
            timestamp: Date.now(),
            data
        }));
    },

    _getOverrides(key) {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : {};
    },

    _applyOverrides(rates, overridesKey, isExchange = true) {
        const overrides = this._getOverrides(overridesKey);
        const rateMap = new Map();

        // 1. Process base rates from BCB
        if (Array.isArray(rates)) {
            rates.forEach(r => {
                if (r && r.data) {
                    const normalizedDate = this._normalizeDate(r.data);

                    let valor;
                    if (isExchange) {
                        // Exchange rates MUST be objects { buy, sell }
                        valor = typeof r.valor === 'object' && r.valor !== null
                            ? { buy: r.valor.buy, sell: r.valor.sell }
                            : { buy: r.valor, sell: r.valor };
                    } else {
                        // Selic rates MUST be single values (numbers/strings)
                        valor = typeof r.valor === 'object' && r.valor !== null
                            ? (r.valor.sell || r.valor.buy || 0)
                            : r.valor;
                    }

                    rateMap.set(normalizedDate, {
                        ...r,
                        data: normalizedDate,
                        valor,
                        isOverridden: false,
                        source: 'OFFICIAL'
                    });
                }
            });
        }

        // 2. Merge overrides (User manual input)
        Object.entries(overrides).forEach(([date, entry]) => {
            const normalizedDate = this._normalizeDate(date);

            let finalValue;
            let source = 'MANUAL';

            if (typeof entry === 'object' && entry !== null) {
                const rawVal = entry.value;
                source = entry.source || 'MANUAL';

                if (isExchange) {
                    if (typeof rawVal === 'object' && rawVal !== null) {
                        finalValue = { buy: rawVal.buy, sell: rawVal.sell };
                    } else {
                        finalValue = { buy: rawVal, sell: rawVal };
                    }
                } else {
                    if (typeof rawVal === 'object' && rawVal !== null) {
                        finalValue = rawVal.sell || rawVal.buy || 0;
                    } else {
                        finalValue = rawVal;
                    }
                }
            } else {
                // Legacy flat value
                if (isExchange) {
                    finalValue = { buy: entry, sell: entry };
                } else {
                    finalValue = entry;
                }
            }

            rateMap.set(normalizedDate, {
                data: normalizedDate,
                valor: finalValue,
                isOverridden: true,
                source
            });
        });

        // 3. Sort by date ascending to ensure consistent UI
        return Array.from(rateMap.values()).sort((a, b) => {
            const [da, ma, ya] = a.data.split('/').map(Number);
            const [db, mb, yb] = b.data.split('/').map(Number);
            return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
        });
    },

    saveOverride(date, value, source = 'MANUAL', overridesKey = OVERRIDES_KEY) {
        const normalizedDate = this._normalizeDate(date);
        const overrides = this._getOverrides(overridesKey);
        // value can be a string (legacy) or an object { buy, sell }
        overrides[normalizedDate] = { value, source };
        localStorage.setItem(overridesKey, JSON.stringify(overrides));
    },

    saveOverridesBatch(updates, overridesKey = OVERRIDES_KEY) {
        const overrides = this._getOverrides(overridesKey);
        updates.forEach(({ date, value, source = 'MANUAL' }) => {
            const normalizedDate = this._normalizeDate(date);
            overrides[normalizedDate] = { value, source };
        });
        localStorage.setItem(overridesKey, JSON.stringify(overrides));
    },

    removeOverride(date, overridesKey = OVERRIDES_KEY) {
        const normalizedTarget = this._normalizeDate(date);
        const overrides = this._getOverrides(overridesKey);

        let changed = false;
        Object.keys(overrides).forEach(key => {
            if (this._normalizeDate(key) === normalizedTarget) {
                delete overrides[key];
                changed = true;
            }
        });

        if (changed) {
            localStorage.setItem(overridesKey, JSON.stringify(overrides));
        }
    },

    async fetchRateForMonth(month, year) {
        try {
            const lastDay = new Date(year, month, 0).getDate();
            const startDate = `01/${month}/${year}`;
            const endDate = `${lastDay}/${month}/${year}`;
            const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`;

            let response;
            try {
                response = await fetch(url);
                if (!response.ok) throw new Error('Direct fetch failed');
            } catch (e) {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                response = await fetch(proxyUrl);
            }

            if (!response.ok) throw new Error('BCB API Unavailable');
            const data = await response.json();
            if (data && data.length > 0) return this._normalizeValue(data[0].valor);
            return null;
        } catch (error) {
            console.error("Error searching BCB for month:", month, year, error);
            throw error;
        }
    },

    async fetchExchangeRateForDate(dateStr, currency) {
        try {
            const ids = this.getSeriesIds(currency);
            if (!ids) throw new Error('Currency not supported');

            const fetchOne = async (seriesId) => {
                const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados?formato=json&dataInicial=${dateStr}&dataFinal=${dateStr}`;
                try {
                    const data = await this._robustFetch(url);
                    return (data && data.length > 0) ? this._normalizeValue(data[0].valor) : null;
                } catch (e) {
                    console.error(`Failed to fetch series ${seriesId} for date ${dateStr}:`, e);
                    return null;
                }
            };

            const [buy, sell] = await Promise.all([
                fetchOne(ids.buy),
                fetchOne(ids.sell)
            ]);

            if (buy || sell) return { buy, sell };
            return null;
        } catch (error) {
            console.error(`Error searching BCB for exchange ${currency} ${dateStr}:`, error);
            throw error;
        }
    },

    async fetchExchangeRatesForRange(startDate, endDate, currency) {
        try {
            const cacheKey = `${HIST_CACHE_PREFIX}${currency.toUpperCase()}_${startDate.replace(/\//g, '')}_${endDate.replace(/\//g, '')}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const { timestamp, data } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_duration) {
                    return data;
                }
            }

            const ids = this.getSeriesIds(currency);
            if (!ids) throw new Error('Currency not supported');

            const fetchOne = async (seriesId) => {
                const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`;
                try {
                    const data = await this._robustFetch(url);
                    return data.map(item => ({
                        ...item,
                        data: this._normalizeDate(item.data),
                        valor: this._normalizeValue(item.valor)
                    }));
                } catch (e) {
                    console.error(`Failed to fetch series ${seriesId} for range ${startDate}-${endDate}:`, e);
                    return [];
                }
            };

            const buyData = await fetchOne(ids.buy);
            const sellData = await fetchOne(ids.sell);

            const parseDate = (d) => {
                const parts = d.split('/');
                return new Date(parts[2], parts[1] - 1, parts[0]);
            };
            const start = parseDate(startDate);
            const end = parseDate(endDate);

            // Combine records by date
            const combined = new Map();
            buyData.forEach(item => {
                const dateKey = item.data;
                combined.set(dateKey, { date: dateKey, buy: item.valor, sell: null });
            });
            sellData.forEach(item => {
                const dateKey = item.data;
                if (combined.has(dateKey)) {
                    combined.get(dateKey).sell = item.valor;
                } else {
                    combined.set(dateKey, { date: dateKey, buy: null, sell: item.valor });
                }
            });

            const result = Array.from(combined.values()).map(item => ({
                date: item.date,
                value: { buy: item.buy, sell: item.sell },
                source: 'BCB'
            }));

            // Save to cache
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data: result
            }));

            return result;
        } catch (error) {
            console.error(`Error searching BCB for range ${currency}:`, error);
            throw error;
        }
    },

    async fetchExchangeRatesWithHistory(currency, startDate, endDate) {
        const ids = this.getSeriesIds(currency);
        if (!ids) return [];

        const overridesKey = `exchange_${currency}_overrides`;

        try {
            const history = await this.fetchExchangeRatesForRange(startDate, endDate, currency);
            const rates = history.map(h => ({ data: h.date, valor: h.value }));
            return this._applyOverrides(rates, overridesKey);
        } catch (error) {
            console.error(`Error fetching history for ${currency}:`, error);
            return this._applyOverrides([], overridesKey);
        }
    },

    async fetchExchangeRates(currency) {
        const ids = this.getSeriesIds(currency);
        if (!ids) return [];

        const overridesKey = `exchange_${currency}_overrides`;
        return this._applyOverrides([], overridesKey);
    }
};
