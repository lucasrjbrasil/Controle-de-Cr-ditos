import { supabase } from './supabase';

const BCB_SELIC_MONTH_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?formato=json';
const CACHE_KEY = 'selic_cache';
const CURRENCIES_KEY = 'exchange_managed_currencies';
const CACHE_duration = 24 * 60 * 60 * 1000; // 24 hours
const HIST_CACHE_PREFIX = 'hist_exchange_v3_';

const INDICATORS_CONFIG_KEY = 'indicator_configs_cache';

const DEFAULT_INDICATORS = {
    'IPCA': { seriesId: 433, label: 'IPCA' },
    'IGPM': { seriesId: 189, label: 'IGP-M' }
};

const DEFAULT_CURRENCIES = {
    'USD': { buy: 1, sell: 10813 },
    'EUR': { buy: 21619, sell: 21620 },
    'GBP': { buy: 21623, sell: 21624 },
    'CAD': { buy: 21635, sell: 21636 },
    'JPY': { buy: 21621, sell: 21622 },
    'CHF': { buy: 21625, sell: 21626 }
};

// In-memory cache for the session
const SESSION_CACHE = {
    selic: {
        data: null,
        lastFetch: 0
    },
    exchange: {}, // Will be keyed by currency
    indicators: {} // Will be keyed by indicator
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes 

export const COMMON_CODES = [
    { name: 'Dólar Americano', symbol: 'USD', buy: 1, sell: 10813 },
    { name: 'Euro', symbol: 'EUR', buy: 21619, sell: 21620 },
    { name: 'Iene Japonês', symbol: 'JPY', buy: 21621, sell: 21622 },
    { name: 'Libra Esterlina', symbol: 'GBP', buy: 21623, sell: 21624 },
    { name: 'Franco Suíço', symbol: 'CHF', buy: 21625, sell: 21626 },
    { name: 'Coroa Dinamarquesa', symbol: 'DKK', buy: 21627, sell: 21628 },
    { name: 'Coroa Norueguesa', symbol: 'NOK', buy: 21629, sell: 21630 },
    { name: 'Coroa Sueca', symbol: 'SEK', buy: 21631, sell: 21632 },
    { name: 'Dólar Australiano', symbol: 'AUD', buy: 21633, sell: 21634 },
    { name: 'Dólar Canadense', symbol: 'CAD', buy: 21635, sell: 21636 },
    { name: 'Coroa Tcheca', symbol: 'CZK', buy: 21637, sell: 21638 },
    { name: 'Dólar de Cingapura', symbol: 'SGD', buy: 21639, sell: 21640 },
    { name: 'Dólar de Hong Kong', symbol: 'HKD', buy: 21641, sell: 21642 },
    { name: 'Dólar Neozelandês', symbol: 'NZD', buy: 21643, sell: 21644 },
    { name: 'Peso Argentino', symbol: 'ARS', buy: 21645, sell: 21646 },
    { name: 'Peso Chileno', symbol: 'CLP', buy: 21647, sell: 21648 },
    { name: 'Peso Colombiano', symbol: 'COP', buy: 21649, sell: 21650 },
    { name: 'Peso Mexicano', symbol: 'MXN', buy: 21651, sell: 21652 },
    { name: 'Peso Uruguaio', symbol: 'UYU', buy: 21653, sell: 21654 },
    { name: 'Rand Sul-Africano', symbol: 'ZAR', buy: 21655, sell: 21656 },
    { name: 'Renminbi (Yuan)', symbol: 'CNY', buy: 21657, sell: 21658 },
    { name: 'Won Sul-Coreano', symbol: 'KRW', buy: 21659, sell: 21660 },
    { name: 'Zloty Polonês', symbol: 'PLN', buy: 21661, sell: 21662 },
    { name: 'Rublo Russo', symbol: 'RUB', buy: 21663, sell: 21664 },
    { name: 'Rupia Indiana', symbol: 'INR', buy: 21665, sell: 21666 },
    { name: 'Ringgit Malaio', symbol: 'MYR', buy: 21667, sell: 21668 },
    { name: 'Peso Filipino', symbol: 'PHP', buy: 21669, sell: 21670 },
    { name: 'Baht Tailandês', symbol: 'THB', buy: 21671, sell: 21672 },
    { name: 'Novo Shekel Israelense', symbol: 'ILS', buy: 21673, sell: 21674 },
    { name: 'Lira Turca', symbol: 'TRY', buy: 21675, sell: 21676 },
    { name: 'Forint Húngaro', symbol: 'HUF', buy: 21677, sell: 21678 },
    { name: 'Rupia Indonésia', symbol: 'IDR', buy: 21679, sell: 21680 },
    { name: 'Riyal Saudita', symbol: 'SAR', buy: 21681, sell: 21682 },
    { name: 'Dirham dos EAU', symbol: 'AED', buy: 21683, sell: 21684 },
    { name: 'Lev Búlgaro', symbol: 'BGN', buy: 21685, sell: 21686 }
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

    _clearIndicatorCache(indicator) {
        if (indicator) {
            delete SESSION_CACHE.indicators[indicator.toUpperCase()];
        } else {
            SESSION_CACHE.indicators = {};
        }
    }

    _normalizeValue(val) {
        if (typeof val === 'string') {
            return val.replace(',', '.');
        }
        return val;
    }

    // Converts any supported date format to YYYY-MM-DD (for DB storage/querying)
    _toDbDate(dateStr) {
        if (!dateStr) return null;
        const s = dateStr.trim();

        // Already YYYY-MM-DD
        if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;

        // DD/MM/YYYY
        if (s.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            const parts = s.split('/');
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        return s;
    }

    // Converts YYYY-MM-DD (from DB) to DD/MM/YYYY (for App)
    _fromDbDate(dateStr) {
        if (!dateStr) return '';
        const s = dateStr.trim();

        // ISO YYYY-MM-DD
        if (s.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const parts = s.split('-');
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }

        // Already DD/MM/YYYY (fallback)
        if (s.match(/^\d{2}\/\d{2}\/\d{4}$/)) return s;

        return s;
    }

    _normalizeDate(dateStr) {
        return this._fromDbDate(dateStr);
    }

    async _fetchOlindaExchangeRates(startDate, endDate, currency) {
        try {
            // Olinda URL format: MM-DD-YYYY
            const toOlindaDate = (d) => {
                const parts = d.split('/');
                return `${parts[1]}-${parts[0]}-${parts[2]}`;
            };

            const s = toOlindaDate(startDate);
            const e = toOlindaDate(endDate);
            const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(codigoMoeda='${currency.toUpperCase()}',dataInicial='${s}',dataFinal='${e}')?$top=1000&$format=json`;

            const res = await this._robustFetch(url);
            if (res && res.value) {
                return res.value.map(item => ({
                    data: this._fromDbDate(item.dataHoraCotacao.split(' ')[0]),
                    valor: {
                        buy: item.cotacaoCompra,
                        sell: item.cotacaoVenda
                    },
                    source: 'OLINDA'
                }));
            }
            return [];
        } catch (error) {
            console.warn(`Olinda fetch failed for ${currency}:`, error);
            return [];
        }
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
        const dbDate = this._toDbDate(date);
        try {
            if (currency) {
                const { error } = await supabase
                    .from('exchange_overrides')
                    .upsert({
                        currency: currency.toUpperCase(),
                        date: dbDate,
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
                        date: dbDate,
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
            const olinda = await this._fetchOlindaExchangeRates(dateStr, dateStr, currency);
            if (olinda && olinda.length > 0) return olinda[0].valor;

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

            // Try Olinda first
            let result = await this._fetchOlindaExchangeRates(startDate, endDate, currency);

            // Fallback to SGS if Olinda results are empty
            if (result.length === 0) {
                const ids = await this.getSeriesIds(currency);
                if (ids) {
                    const fetchOne = async (seriesId) => {
                        const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`;
                        try {
                            const data = await this._robustFetch(url);
                            return data.map(item => ({
                                data: this._fromDbDate(item.data),
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

                    result = Array.from(combined.values()).map(item => ({
                        data: item.date,
                        valor: { buy: item.buy, sell: item.sell },
                        source: 'BCB_SGS'
                    }));
                }
            }

            if (result.length > 0) {
                localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
            }
            return result;
        } catch (error) {
            console.error(`Error fetching exchange range for ${currency}:`, error);
            throw error;
        }
    }

    async fetchExchangeRatesWithHistory(currency, startDate, endDate) {
        if (!currency || currency === 'BRL') return [];

        try {
            const dbStartDate = this._toDbDate(startDate);
            const dbEndDate = this._toDbDate(endDate);

            const { data: stored, error: dbError } = await supabase
                .from('exchange_overrides')
                .select('*')
                .eq('currency', currency.toUpperCase())
                .gte('date', dbStartDate)
                .lte('date', dbEndDate);

            if (dbError) throw dbError;

            if (!stored || stored.length === 0) {
                try {
                    // This fetches from BCB (returns DD/MM/YYYY dates and values)
                    const history = await this.fetchExchangeRatesForRange(startDate, endDate, currency);

                    if (history && history.length > 0) {
                        const updates = history.map(h => ({
                            currency: currency.toUpperCase(),
                            date: this._toDbDate(h.data || h.date), // Robustness
                            buyValue: parseFloat((h.valor || h.value)?.buy || 0),
                            sellValue: parseFloat((h.valor || h.value)?.sell || 0),
                            source: 'BCB'
                        }));
                        await supabase.from('exchange_overrides').upsert(updates, { onConflict: 'currency,date' });
                    }
                } catch (bcbError) {
                    console.warn(`BCB fallback failed for ${currency}:`, bcbError);
                }
            }

            // Re-fetch or use logic to merge. For simplicity re-fetching to ensure consistent source of truth
            const { data: finalData } = await supabase
                .from('exchange_overrides')
                .select('*')
                .eq('currency', currency.toUpperCase())
                .gte('date', dbStartDate)
                .lte('date', dbEndDate)
                .order('date', { ascending: true });

            return (finalData || []).map(r => ({
                data: this._fromDbDate(r.date), // Return as DD/MM/YYYY for the app
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
            data: this._fromDbDate(r.date),
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

    async getIndicatorConfigs() {
        try {
            const { data, error } = await supabase
                .from('indicator_config')
                .select('*');

            if (error) throw error;

            if (data && data.length > 0) {
                const configMap = {};
                data.forEach(item => {
                    configMap[item.indicator] = { seriesId: item.seriesId, label: item.label || item.indicator };
                });
                return configMap;
            }

            // If empty, seed with defaults (optional, or just return defaults)
            return DEFAULT_INDICATORS;
        } catch (error) {
            console.error('Error fetching indicator configs:', error);
            return DEFAULT_INDICATORS;
        }
    }

    async addIndicatorConfig(indicator, seriesId, label) {
        try {
            const { error } = await supabase
                .from('indicator_config')
                .upsert({
                    indicator: indicator.toUpperCase(),
                    seriesId: parseInt(seriesId),
                    label: label || indicator.toUpperCase(),
                    updatedAt: new Date().toISOString()
                });
            if (error) throw error;
            this._clearIndicatorCache(indicator);
        } catch (error) {
            console.error('Error adding indicator config:', error);
            throw error;
        }
    }

    async removeIndicatorConfig(indicator) {
        try {
            const { error } = await supabase
                .from('indicator_config')
                .delete()
                .eq('indicator', indicator.toUpperCase());
            if (error) throw error;

            // Also clean up overrides for this indicator
            await supabase
                .from('indicator_overrides')
                .delete()
                .eq('indicator', indicator.toUpperCase());

            this._clearIndicatorCache(indicator);
        } catch (error) {
            console.error('Error removing indicator config:', error);
            throw error;
        }
    }

    async fetchIndicatorRates(indicator) {
        if (!indicator) return [];
        const ind = indicator.toUpperCase();

        try {
            const nowTime = Date.now();
            if (SESSION_CACHE.indicators[ind] && (nowTime - SESSION_CACHE.indicators[ind].lastFetch < CACHE_TTL)) {
                return SESSION_CACHE.indicators[ind].data;
            }

            const { data: stored, error: dbError } = await supabase
                .from('indicator_overrides')
                .select('*')
                .eq('indicator', ind)
                .order('date', { ascending: true });

            if (dbError) throw dbError;

            let finalRates = (stored || []).map(r => ({
                data: this._fromDbDate(r.date),
                valor: r.value,
                isOverridden: r.source === 'MANUAL',
                source: r.source
            }));

            // Sync logic if needed (similar to Selic)
            // For now, return what's in DB
            const result = finalRates.sort((a, b) => {
                const [da, ma, ya] = a.data.split('/').map(Number);
                const [db, mb, yb] = b.data.split('/').map(Number);
                return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
            });

            SESSION_CACHE.indicators[ind] = {
                data: result,
                lastFetch: Date.now()
            };
            return result;
        } catch (error) {
            console.error(`Error in fetchIndicatorRates for ${ind}:`, error);
            return SESSION_CACHE.indicators[ind]?.data || [];
        }
    }

    async saveIndicatorOverride(indicator, date, value, source = 'MANUAL') {
        const ind = indicator.toUpperCase();
        const dbDate = this._toDbDate(date);
        try {
            const { error } = await supabase
                .from('indicator_overrides')
                .upsert({
                    indicator: ind,
                    date: dbDate,
                    value: parseFloat(value),
                    source
                }, { onConflict: 'indicator,date' });
            if (error) throw error;
            this._clearIndicatorCache(ind);
        } catch (error) {
            console.error('Error saving indicator override:', error);
            throw error;
        }
    }

    async removeIndicatorOverride(indicator, date) {
        const ind = indicator.toUpperCase();
        const dbDate = this._toDbDate(date);
        try {
            const { error } = await supabase
                .from('indicator_overrides')
                .delete()
                .eq('indicator', ind)
                .eq('date', dbDate);
            if (error) throw error;
            this._clearIndicatorCache(ind);
        } catch (error) {
            console.error('Error removing indicator override:', error);
            throw error;
        }
    }

    async fetchIndicatorRateForMonth(indicator, month, year) {
        const configs = await this.getIndicatorConfigs();
        const config = configs[indicator.toUpperCase()];
        if (!config) throw new Error('Indicator not supported or configured');

        try {
            const lastDay = new Date(year, month, 0).getDate();
            const startDate = `01/${month}/${year}`;
            const endDate = `${lastDay}/${month}/${year}`;
            const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${config.seriesId}/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`;

            const data = await this._robustFetch(url);
            if (data && data.length > 0) return this._normalizeValue(data[0].valor);
            return null;
        } catch (error) {
            console.error(`Error fetching ${indicator} for month:`, month, year, error);
            throw error;
        }
    }

    async syncDailyExchangeRates() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const lastSync = localStorage.getItem('last_exchange_sync');
            if (lastSync === today) {
                return { status: 'already_synced' };
            }

            const managed = await this.getManagedCurrencies();
            const currencies = Object.keys(managed);

            if (currencies.length === 0) return { status: 'no_currencies' };

            const now = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(now.getDate() - 30);

            const pad = (n) => n.toString().padStart(2, '0');
            const startDate = `${pad(thirtyDaysAgo.getDate())}/${pad(thirtyDaysAgo.getMonth() + 1)}/${thirtyDaysAgo.getFullYear()}`;
            const endDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

            let syncedCount = 0;
            for (const currency of currencies) {
                if (currency === 'BRL') continue;

                try {
                    const history = await this.fetchExchangeRatesForRange(startDate, endDate, currency);

                    if (history && history.length > 0) {
                        const updates = history.map(h => ({
                            currency: currency.toUpperCase(),
                            date: this._toDbDate(h.data || h.date),
                            buyValue: parseFloat((h.valor || h.value)?.buy || 0),
                            sellValue: parseFloat((h.valor || h.value)?.sell || 0),
                            source: 'BCB'
                        }));
                        await supabase.from('exchange_overrides').upsert(updates, { onConflict: 'currency,date' });
                        syncedCount++;
                    }
                } catch (err) {
                    console.warn(`Failed to sync rates for ${currency}:`, err);
                }
            }

            localStorage.setItem('last_exchange_sync', today);
            this._clearExchangeCache();
            return { status: 'success', currenciesSynced: syncedCount };
        } catch (error) {
            console.error('Error syncing daily exchange rates:', error);
            throw error;
        }
    }
}

export const bcbService = new BCBService();
