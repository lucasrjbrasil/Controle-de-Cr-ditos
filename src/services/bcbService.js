import { supabase } from './supabase';

const BCB_SELIC_MONTH_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?formato=json';
const CACHE_KEY = 'selic_cache';
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

// In-memory cache for the session
const SESSION_CACHE = {
    selic: {
        data: null,
        lastFetch: 0
    },
    exchange: {} // Will be keyed by currency
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes 

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

class BCBService {
    _clearSelicCache() {
        SESSION_CACHE.selic.data = null;
        SESSION_CACHE.selic.lastFetch = 0;
    }

    _clearExchangeCache(currency) {
        if (currency) {
            delete SESSION_CACHE.exchange[currency.toUpperCase()];
        } else {
            SESSION_CACHE.exchange = {};
        }
    }

    _normalizeValue(val) {
        if (typeof val === 'string') {
            return val.replace(',', '.');
        }
        return val;
    }

    _normalizeDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.trim().split('/');

        let day, month, year;

        if (parts.length === 3) {
            day = parts[0].padStart(2, '0');
            month = parts[1].padStart(2, '0');
            year = parts[2];
        } else if (parts.length === 2) {
            day = '01';
            month = parts[0].padStart(2, '0');
            year = parts[1];
        } else {
            return dateStr.trim();
        }

        return `${day}/${month}/${year}`;
    }

    async _robustFetch(url) {
        const timestamp = Date.now();
        const fetchOptions = { cache: 'no-store' };

        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&disableCache=${timestamp}`;
            const response = await fetch(proxyUrl, fetchOptions);
            if (response.ok) return await response.json();
        } catch (e) {
            console.warn("AllOrigins proxy failed.", e);
        }

        try {
            const urlWithCache = url + `&_t=${timestamp}`;
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(urlWithCache)}`;
            const response = await fetch(proxyUrl, fetchOptions);
            if (response.ok) return await response.json();
        } catch (e) {
            console.warn("CORSProxy.io failed.", e);
        }

        try {
            const response = await fetch(url, fetchOptions);
            if (response.ok) return await response.json();
        } catch (e) {
            console.warn("Direct fetch failed.", e);
        }

        throw new Error("Falha de conexão com o BCB (todas as tentativas falharam).");
    }

    async getSeriesIds(currency) {
        const managed = await this.getManagedCurrencies();
        const ids = managed[currency.toUpperCase()];
        if (!ids) return null;
        return ids;
    }

    async getManagedCurrencies() {
        try {
            const { data, error } = await supabase
                .from('exchange_config')
                .select('*');

            if (error) throw error;

            if (data && data.length > 0) {
                const configMap = {};
                data.forEach(item => {
                    configMap[item.symbol] = { buy: item.buySeriesId, sell: item.sellSeriesId };
                });
                return configMap;
            }

            for (const [symbol, ids] of Object.entries(DEFAULT_CURRENCIES)) {
                await this.addManagedCurrency(symbol, ids.buy, ids.sell);
            }
            return DEFAULT_CURRENCIES;
        } catch (error) {
            console.error('Error fetching managed currencies from Supabase:', error);
            return DEFAULT_CURRENCIES;
        }
    }

    async clearHistoryCache(currency) {
        const prefix = currency ? `${HIST_CACHE_PREFIX}${currency.toUpperCase()}_` : HIST_CACHE_PREFIX;
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(prefix)) {
                localStorage.removeItem(key);
            }
        });

        if (!currency) {
            localStorage.removeItem(CACHE_KEY);
            this._clearSelicCache();
        }
    }

    async addManagedCurrency(symbol, buySeriesId, sellSeriesId) {
        try {
            const { error } = await supabase
                .from('exchange_config')
                .upsert({
                    symbol: symbol.toUpperCase(),
                    buySeriesId: parseInt(buySeriesId),
                    sellSeriesId: parseInt(sellSeriesId),
                    updatedAt: new Date().toISOString()
                });
            if (error) throw error;
        } catch (error) {
            console.error('Error adding managed currency to Supabase:', error);
            throw error;
        }
    }

    async removeManagedCurrency(symbol) {
        try {
            const { error } = await supabase
                .from('exchange_config')
                .delete()
                .eq('symbol', symbol.toUpperCase());
            if (error) throw error;
        } catch (error) {
            console.error('Error removing managed currency from Supabase:', error);
            throw error;
        }
    }

    async fetchSelicRates() {
        try {
            const nowTime = Date.now();
            if (SESSION_CACHE.selic.data && (nowTime - SESSION_CACHE.selic.lastFetch < CACHE_TTL)) {
                return SESSION_CACHE.selic.data;
            }

            const { data: storedRates, error: dbError } = await supabase
                .from('selic_overrides')
                .select('*')
                .order('date', { ascending: true });

            if (dbError) throw dbError;

            let finalRates = (storedRates || []).map(r => ({
                data: r.date,
                valor: r.value,
                isOverridden: r.source === 'MANUAL',
                source: r.source
            }));

            let needsBCBFetch = false;
            if (finalRates.length === 0) {
                needsBCBFetch = true;
            } else {
                const parseToDateValue = (dateStr) => {
                    const parts = dateStr.split('/');
                    if (parts.length === 3) return parseInt(parts[2]) * 10000 + parseInt(parts[1]) * 100 + parseInt(parts[0]);
                    return 0;
                };

                const latest = [...finalRates].sort((a, b) => parseToDateValue(b.data) - parseToDateValue(a.data))[0];
                const [d, m, y] = latest.data.split('/');
                const now = new Date();
                const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
                const currentYear = now.getFullYear().toString();

                if (m !== currentMonth || y !== currentYear) {
                    needsBCBFetch = true;
                }
            }

            if (needsBCBFetch) {
                try {
                    const now = new Date();
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(now.getMonth() - 6);

                    const pad = (n) => n.toString().padStart(2, '0');
                    const startDate = `01/${pad(sixMonthsAgo.getMonth() + 1)}/${sixMonthsAgo.getFullYear()}`;
                    const endDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

                    const syncUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`;
                    const bcbData = await this._robustFetch(syncUrl);

                    if (bcbData && Array.isArray(bcbData)) {
                        const updates = bcbData.map(r => ({
                            date: this._normalizeDate(r.data),
                            value: parseFloat(this._normalizeValue(r.valor)),
                            source: 'OFFICIAL'
                        }));

                        const manualDates = new Set(finalRates.filter(r => r.source === 'MANUAL').map(r => r.data));
                        const filteredUpdates = updates.filter(u => !manualDates.has(u.date));

                        if (filteredUpdates.length > 0) {
                            await supabase.from('selic_overrides').upsert(filteredUpdates, { onConflict: 'date' });

                            filteredUpdates.forEach(update => {
                                const index = finalRates.findIndex(r => r.data === update.date);
                                if (index !== -1) {
                                    if (finalRates[index].source === 'OFFICIAL') {
                                        finalRates[index].valor = update.value;
                                    }
                                } else {
                                    finalRates.push({
                                        data: update.date,
                                        valor: update.value,
                                        isOverridden: false,
                                        source: 'OFFICIAL'
                                    });
                                }
                            });
                        }
                    }
                } catch (bcbError) {
                    console.warn("Could not sync with BCB:", bcbError);
                }
            }

            const result = finalRates.sort((a, b) => {
                const [da, ma, ya] = a.data.split('/').map(Number);
                const [db, mb, yb] = b.data.split('/').map(Number);
                return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
            });

            SESSION_CACHE.selic.data = result;
            SESSION_CACHE.selic.lastFetch = Date.now();
            return result;
        } catch (error) {
            console.error("Error in fetchSelicRates:", error);
            return SESSION_CACHE.selic.data || [];
        }
    }

    async saveOverride(date, value, source = 'MANUAL', currency = null) {
        const normalizedDate = this._normalizeDate(date);
        try {
            if (currency) {
                const { error } = await supabase
                    .from('exchange_overrides')
                    .upsert({
                        currency: currency.toUpperCase(),
                        date: normalizedDate,
                        buyValue: value.buy,
                        sellValue: value.sell,
                        source
                    }, { onConflict: 'currency,date' });
                if (error) throw error;
                this._clearExchangeCache(currency);
            } else {
                const { error } = await supabase
                    .from('selic_overrides')
                    .upsert({
                        date: normalizedDate,
                        value: parseFloat(value),
                        source
                    });
                if (error) throw error;
                this._clearSelicCache();
            }
        } catch (error) {
            console.error('Error saving override:', error);
            throw error;
        }
    }

    async saveOverridesBatch(updates, currency = null) {
        try {
            for (const update of updates) {
                await this.saveOverride(update.date, update.value || update, update.source || 'MANUAL', currency);
            }
        } catch (error) {
            console.error('Error in batch save:', error);
            throw error;
        }
    }

    async removeOverride(date, currency = null) {
        const normalizedDate = this._normalizeDate(date);
        try {
            if (currency) {
                const { error } = await supabase
                    .from('exchange_overrides')
                    .delete()
                    .eq('currency', currency.toUpperCase())
                    .eq('date', normalizedDate);
                if (error) throw error;
                this._clearExchangeCache(currency);
            } else {
                const { error } = await supabase
                    .from('selic_overrides')
                    .delete()
                    .eq('date', normalizedDate);
                if (error) throw error;
                this._clearSelicCache();
            }
        } catch (error) {
            console.error('Error removing override:', error);
            throw error;
        }
    }

    async clearAllOverrides(currency) {
        try {
            const { error } = await supabase
                .from('exchange_overrides')
                .delete()
                .eq('currency', currency.toUpperCase());
            if (error) throw error;
            this._clearExchangeCache(currency);
        } catch (error) {
            console.error('Error clearing all overrides:', error);
            throw error;
        }
    }

    async fetchRateForMonth(month, year) {
        try {
            const lastDay = new Date(year, month, 0).getDate();
            const startDate = `01/${month}/${year}`;
            const endDate = `${lastDay}/${month}/${year}`;
            const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`;

            const data = await this._robustFetch(url);
            if (data && data.length > 0) return this._normalizeValue(data[0].valor);
            return null;
        } catch (error) {
            console.error("Error fetching rate for month:", month, year, error);
            throw error;
        }
    }

    async fetchExchangeRateForDate(dateStr, currency) {
        try {
            const ids = await this.getSeriesIds(currency);
            if (!ids) throw new Error('Currency not supported');

            const fetchOne = async (seriesId) => {
                const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados?formato=json&dataInicial=${dateStr}&dataFinal=${dateStr}`;
                try {
                    const data = await this._robustFetch(url);
                    return (data && data.length > 0) ? this._normalizeValue(data[0].valor) : null;
                } catch (e) {
                    return null;
                }
            };

            const [buy, sell] = await Promise.all([fetchOne(ids.buy), fetchOne(ids.sell)]);
            if (buy || sell) return { buy, sell };
            return null;
        } catch (error) {
            console.error(`Error fetching exchange for ${currency} ${dateStr}:`, error);
            throw error;
        }
    }

    async fetchExchangeRatesForRange(startDate, endDate, currency) {
        try {
            const cacheKey = `${HIST_CACHE_PREFIX}${currency.toUpperCase()}_${startDate.replace(/\//g, '')}_${endDate.replace(/\//g, '')}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const { timestamp, data } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_duration) return data;
            }

            const ids = await this.getSeriesIds(currency);
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
                    return [];
                }
            };

            const [buyData, sellData] = await Promise.all([fetchOne(ids.buy), fetchOne(ids.sell)]);
            const combined = new Map();
            buyData.forEach(item => combined.set(item.data, { date: item.data, buy: item.valor, sell: null }));
            sellData.forEach(item => {
                if (combined.has(item.data)) combined.get(item.data).sell = item.valor;
                else combined.set(item.data, { date: item.data, buy: null, sell: item.valor });
            });

            const result = Array.from(combined.values()).map(item => ({
                date: item.date,
                value: { buy: item.buy, sell: item.sell },
                source: 'BCB'
            }));

            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
            return result;
        } catch (error) {
            console.error(`Error fetching exchange range for ${currency}:`, error);
            throw error;
        }
    }

    async fetchExchangeRatesWithHistory(currency, startDate, endDate) {
        if (!currency || currency === 'BRL') return [];

        try {
            const { data: stored, error: dbError } = await supabase
                .from('exchange_overrides')
                .select('*')
                .eq('currency', currency.toUpperCase())
                .gte('date', this._normalizeDate(startDate))
                .lte('date', this._normalizeDate(endDate));

            if (dbError) throw dbError;

            if (!stored || stored.length === 0) {
                try {
                    const history = await this.fetchExchangeRatesForRange(startDate, endDate, currency);
                    if (history && history.length > 0) {
                        const updates = history.map(h => ({
                            currency: currency.toUpperCase(),
                            date: h.date,
                            buyValue: parseFloat(h.value.buy),
                            sellValue: parseFloat(h.value.sell),
                            source: 'BCB'
                        }));
                        await supabase.from('exchange_overrides').upsert(updates, { onConflict: 'currency,date' });
                    }
                } catch (bcbError) {
                    console.warn(`BCB fallback failed for ${currency}:`, bcbError);
                }
            }

            const { data: finalData } = await supabase
                .from('exchange_overrides')
                .select('*')
                .eq('currency', currency.toUpperCase())
                .gte('date', this._normalizeDate(startDate))
                .lte('date', this._normalizeDate(endDate))
                .order('date', { ascending: true });

            return (finalData || []).map(r => ({
                data: r.date,
                valor: { buy: r.buyValue, sell: r.sellValue },
                isOverridden: r.source === 'MANUAL',
                source: r.source
            }));
        } catch (error) {
            console.error(`Error in fetchExchangeRatesWithHistory for ${currency}:`, error);
            return [];
        }
    }

    async fetchExchangeRates(currency) {
        if (!currency || currency === 'BRL') return [];

        const curr = currency.toUpperCase();
        const nowTime = Date.now();
        if (SESSION_CACHE.exchange[curr] && (nowTime - SESSION_CACHE.exchange[curr].lastFetch < CACHE_TTL)) {
            return SESSION_CACHE.exchange[curr].data;
        }

        const { data } = await supabase
            .from('exchange_overrides')
            .select('*')
            .eq('currency', curr)
            .order('date', { ascending: false })
            .limit(100);

        const result = (data || []).map(r => ({
            data: r.date,
            valor: { buy: r.buyValue, sell: r.sellValue },
            isOverridden: r.source === 'MANUAL',
            source: r.source
        }));

        SESSION_CACHE.exchange[curr] = {
            data: result,
            lastFetch: Date.now()
        };

        return result;
    }

    async verifySeries(seriesId) {
        const today = new Date();
        const past = new Date();
        past.setDate(today.getDate() - 10);

        const pad = (n) => n.toString().padStart(2, '0');
        const d_end = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;
        const d_start = `${pad(past.getDate())}/${pad(past.getMonth() + 1)}/${past.getFullYear()}`;

        const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados?formato=json&dataInicial=${d_start}&dataFinal=${d_end}`;
        const data = await this._robustFetch(url);
        return data.reverse().slice(0, 5).map(item => ({
            date: this._normalizeDate(item.data),
            value: this._normalizeValue(item.valor)
        }));
    }
}

export const bcbService = new BCBService();
