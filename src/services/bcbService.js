import { supabase } from './supabase';

// Use sessionStorage instead of localStorage for sensitive financial data (more secure - cleared on tab close)
const CACHE_DURATION = 864e5, HIST_CACHE_PREFIX = 'hist_exchange_v3_', CACHE_TTL = 3e5;
const DEFAULT_INDICATORS = { IPCA: { seriesId: 433, label: 'IPCA' }, IGPM: { seriesId: 189, label: 'IGP-M' } };
const SESSION_CACHE = { selic: { data: null, lastFetch: 0 }, exchange: {}, indicators: {} };
const pad = n => n.toString().padStart(2, '0');
const toOlinda = d => { const [dd, mm, yyyy] = d.split('/'); return `${mm}-${dd}-${yyyy}`; };

// Logger that only logs in development
const devLog = import.meta.env.PROD ? () => { } : console.log;
const devError = import.meta.env.PROD ? () => { } : console.error;

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

const DEFAULT_CURRENCIES = Object.fromEntries(COMMON_CODES.map(c => [c.symbol, { buy: c.buy, sell: c.sell }]));

class BCBService {
    /**
     * Clears internal memory cache.
     * @param {string} type - Cache type ('selic', 'exchange', 'indicators')
     * @param {string} [key] - Specific key to clear (e.g. currency symbol)
     */
    _clearCache = (type, key) => {
        if (key) {
            delete SESSION_CACHE[type][key.toUpperCase()];
        } else {
            SESSION_CACHE[type] = type === 'selic' ? { data: null, lastFetch: 0 } : {};
        }
    }

    /**
     * Normalizes numeric string values (replaces comma with dot).
     * @param {string|number} v 
     * @returns {string|number}
     */
    _normalizeValue = v => typeof v === 'string' ? v.replace(',', '.') : v;

    /**
     * Converts various date formats to database format (YYYY-MM-DD).
     * @param {string} d 
     * @returns {string|null}
     */
    _toDbDate = d => {
        if (!d) return null;
        const trimmed = d.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed.split('/').reverse().join('-');
        return trimmed;
    }

    /**
     * Converts database date (YYYY-MM-DD) to display format (DD/MM/YYYY).
     * @param {string} d 
     * @returns {string}
     */
    _fromDbDate = d => {
        if (!d) return '';
        const trimmed = d.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed.split('-').reverse().join('/');
        return trimmed;
    }

    /**
     * Formats a Date object to DD/MM/YYYY string.
     * @param {Date} d 
     * @returns {string}
     */
    _fmtDate = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

    /**
     * Sorts an array of objects by their 'data' property (date string).
     * @param {Array} arr 
     * @param {boolean} [asc=true] 
     * @returns {Array}
     */
    _sortByDate = (arr, asc = true) => {
        return arr.sort((a, b) => {
            const parse = s => {
                const [d, m, y] = s.split('/').map(Number);
                return new Date(y, m - 1, d);
            };
            return asc ? parse(a.data) - parse(b.data) : parse(b.data) - parse(a.data);
        });
    }

    /**
     * Maps raw database or API response to consistent rate object structure.
     * @param {Object} r 
     * @param {boolean} isCurrency 
     * @returns {Object}
     */
    _mapRate = (r, isCurrency) => {
        if (isCurrency) {
            return {
                data: this._fromDbDate(r.date),
                valor: { buy: r.buyValue, sell: r.sellValue },
                isOverridden: r.source === 'MANUAL',
                source: r.source
            };
        }
        return {
            data: r.date || this._fromDbDate(r.date),
            valor: r.value,
            isOverridden: r.source === 'MANUAL',
            source: r.source
        };
    }

    /**
     * Robust fetch with fallback to Edge Function proxy and timeout support.
     * @param {string} url 
     * @param {number} [timeout=10000] 
     * @returns {Promise<any>}
     */
    async _robustFetch(url, timeout = 10000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const opts = { cache: 'no-store', signal: controller.signal };

        try {
            // SECURITY: Try direct API call first (most secure)
            try {
                const r = await fetch(url, opts);
                if (r.ok) return r.json();
            } catch (e) {
                if (e.name === 'AbortError') throw e; // Don't catch timeout yet
                devLog('[BCBService] Direct API call failed, trying Secure Proxy as fallback');
            }

            // SECURITY UPGRADE: Use our own Supabase Edge Function as proxy
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
                const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-bcb?url=${encodeURIComponent(url)}`;

                const r = await fetch(edgeFunctionUrl, {
                    ...opts,
                    headers: {
                        ...opts.headers,
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (r.ok) {
                    devLog('[BCBService] Using Secure Edge Function Proxy');
                    return r.json();
                } else {
                    devLog('[BCBService] Edge Function Proxy returned error:', r.status, await r.text());
                }
            } catch (e) {
                if (e.name === 'AbortError') throw e;
                devError('[BCBService] Edge Function Proxy failed:', e);
            }
        } finally {
            clearTimeout(timeoutId);
        }

        throw new Error("Falha de conexão com o BCB.");
    }

    async _fetchOlinda(start, end, currency) {
        try {
            const res = await this._robustFetch(`https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(codigoMoeda='${currency.toUpperCase()}',dataInicial='${toOlinda(start)}',dataFinal='${toOlinda(end)}')?$top=1000&$format=json`);
            return res?.value?.map(i => ({
                data: this._fromDbDate(i.dataHoraCotacao.split(' ')[0]),
                valor: { buy: i.cotacaoCompra, sell: i.cotacaoVenda },
                source: 'OLINDA'
            })) || [];
        } catch { return []; }
    }

    async getSeriesIds(currency) { return (await this.getManagedCurrencies())[currency.toUpperCase()] || null; }

    async getManagedCurrencies() {
        try {
            const { data, error } = await supabase.from('exchange_config').select('*');
            if (error) throw error;
            if (data?.length) return Object.fromEntries(data.map(i => [i.symbol, { buy: i.buySeriesId, sell: i.sellSeriesId }]));
            await Promise.all(Object.entries(DEFAULT_CURRENCIES).map(([s, ids]) => this.addManagedCurrency(s, ids.buy, ids.sell)));
            return DEFAULT_CURRENCIES;
        } catch { return DEFAULT_CURRENCIES; }
    }

    clearHistoryCache(currency) {
        const prefix = currency ? `${HIST_CACHE_PREFIX}${currency.toUpperCase()}_` : HIST_CACHE_PREFIX;
        Object.keys(sessionStorage).filter(k => k.startsWith(prefix)).forEach(k => sessionStorage.removeItem(k));
        if (!currency) this._clearCache('selic');
    }

    async addManagedCurrency(symbol, buySeriesId, sellSeriesId) {
        const { error } = await supabase.from('exchange_config').upsert({ symbol: symbol.toUpperCase(), buySeriesId: +buySeriesId, sellSeriesId: +sellSeriesId, updatedAt: new Date().toISOString() });
        if (error) throw error;
    }

    async removeManagedCurrency(symbol) {
        const { error } = await supabase.from('exchange_config').delete().eq('symbol', symbol.toUpperCase());
        if (error) throw error;
    }

    async fetchSelicRates() {
        try {
            if (SESSION_CACHE.selic.data && Date.now() - SESSION_CACHE.selic.lastFetch < CACHE_TTL) return SESSION_CACHE.selic.data;
            const { data: stored, error } = await supabase.from('selic_overrides').select('*').order('date', { ascending: true });
            if (error) throw error;
            let rates = (stored || []).map(r => ({ data: r.date, valor: r.value, isOverridden: r.source === 'MANUAL', source: r.source }));
            if (this._needsSync(rates)) {
                try {
                    const now = new Date(), ago = new Date(); ago.setMonth(now.getMonth() - 6);
                    const bcb = await this._robustFetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?formato=json&dataInicial=01/${pad(ago.getMonth() + 1)}/${ago.getFullYear()}&dataFinal=${this._fmtDate(now)}`);
                    if (Array.isArray(bcb)) {
                        const manual = new Set(rates.filter(r => r.source === 'MANUAL').map(r => r.data));
                        const updates = bcb.map(r => ({ date: this._fromDbDate(r.data), value: parseFloat(this._normalizeValue(r.valor)), source: 'OFFICIAL' })).filter(u => !manual.has(u.date));
                        if (updates.length) {
                            await supabase.from('selic_overrides').upsert(updates, { onConflict: 'date' });
                            updates.forEach(u => { const i = rates.findIndex(r => r.data === u.date); i !== -1 && rates[i].source === 'OFFICIAL' ? rates[i].valor = u.value : i === -1 && rates.push({ data: u.date, valor: u.value, isOverridden: false, source: 'OFFICIAL' }); });
                        }
                    }
                } catch { }
            }
            const result = this._sortByDate(rates);
            SESSION_CACHE.selic = { data: result, lastFetch: Date.now() };
            return result;
        } catch { return SESSION_CACHE.selic.data || []; }
    }

    _needsSync(rates) {
        if (!rates.length) return true;
        const p = d => { const [dd, mm, yyyy] = d.split('/').map(Number); return yyyy * 1e4 + mm * 100 + dd; };
        const [, m, y] = [...rates].sort((a, b) => p(b.data) - p(a.data))[0].data.split('/');
        const now = new Date();
        return m !== pad(now.getMonth() + 1) || y !== now.getFullYear().toString();
    }

    async saveOverride(date, value, source = 'MANUAL', currency = null) {
        const dbDate = this._toDbDate(date);
        if (currency) {
            const { error } = await supabase.from('exchange_overrides').upsert({ currency: currency.toUpperCase(), date: dbDate, buyValue: value.buy, sellValue: value.sell, source }, { onConflict: 'currency,date' });
            if (error) throw error;
            this._clearCache('exchange', currency);
        } else {
            const { error } = await supabase.from('selic_overrides').upsert({ date: dbDate, value: parseFloat(value), source });
            if (error) throw error;
            this._clearCache('selic');
        }
    }

    async saveOverridesBatch(updates, currency = null) { for (const u of updates) await this.saveOverride(u.date, u.value || u, u.source || 'MANUAL', currency); }

    async removeOverride(date, currency = null) {
        const dbDate = this._toDbDate(date);
        if (currency) {
            const { error } = await supabase.from('exchange_overrides').delete().eq('currency', currency.toUpperCase()).eq('date', dbDate);
            if (error) throw error;
            this._clearCache('exchange', currency);
        } else {
            const { error } = await supabase.from('selic_overrides').delete().eq('date', dbDate);
            if (error) throw error;
            this._clearCache('selic');
        }
    }

    async clearAllOverrides(currency) {
        const { error } = await supabase.from('exchange_overrides').delete().eq('currency', currency.toUpperCase());
        if (error) throw error;
        this._clearCache('exchange', currency);
    }

    async fetchRateForMonth(month, year) {
        const lastDay = new Date(year, month, 0).getDate();
        const data = await this._robustFetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?formato=json&dataInicial=01/${month}/${year}&dataFinal=${lastDay}/${month}/${year}`);
        return data?.length ? this._normalizeValue(data[0].valor) : null;
    }

    async fetchExchangeRateForDate(dateStr, currency) {
        const olinda = await this._fetchOlinda(dateStr, dateStr, currency);
        if (olinda?.length) return olinda[0].valor;
        const ids = await this.getSeriesIds(currency);
        if (!ids) throw new Error('Currency not supported');
        const fetch1 = async id => { try { const d = await this._robustFetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${id}/dados?formato=json&dataInicial=${dateStr}&dataFinal=${dateStr}`); return d?.length ? this._normalizeValue(d[0].valor) : null; } catch { return null; } };
        const [buy, sell] = await Promise.all([fetch1(ids.buy), fetch1(ids.sell)]);
        return buy || sell ? { buy, sell } : null;
    }

    async fetchExchangeRatesForRange(start, end, currency) {
        const key = `${HIST_CACHE_PREFIX}${currency.toUpperCase()}_${start.replace(/\//g, '')}_${end.replace(/\//g, '')}`;
        const cached = sessionStorage.getItem(key);
        if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) return data;
        }

        let result = await this._fetchOlinda(start, end, currency);

        if (!result.length) {
            const ids = await this.getSeriesIds(currency);
            if (ids) {
                const fetch1 = async id => {
                    try {
                        const response = await this._robustFetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${id}/dados?formato=json&dataInicial=${start}&dataFinal=${end}`);
                        return response.map(i => ({
                            data: this._fromDbDate(i.data),
                            valor: this._normalizeValue(i.valor)
                        }));
                    } catch {
                        return [];
                    }
                };

                const [buy, sell] = await Promise.all([fetch1(ids.buy), fetch1(ids.sell)]);
                const m = new Map();

                buy.forEach(i => m.set(i.data, { date: i.data, buy: i.valor, sell: null }));
                sell.forEach(i => {
                    const e = m.get(i.data);
                    e ? e.sell = i.valor : m.set(i.data, { date: i.data, buy: null, sell: i.valor });
                });

                result = [...m.values()].map(i => ({
                    data: i.date,
                    valor: { buy: i.buy, sell: i.sell },
                    source: 'BCB_SGS'
                }));
            }
        }

        if (result.length) {
            sessionStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data: result }));
        }
        return result;
    }

    async fetchExchangeRatesWithHistory(currency, start, end) {
        if (!currency || currency === 'BRL') return [];
        const [dbStart, dbEnd, curr] = [this._toDbDate(start), this._toDbDate(end), currency.toUpperCase()];
        try {
            const { data: stored, error } = await supabase.from('exchange_overrides').select('*').eq('currency', curr).gte('date', dbStart).lte('date', dbEnd);
            if (error) throw error;
            if (!stored?.length) {
                try {
                    const h = await this.fetchExchangeRatesForRange(start, end, currency);
                    if (h?.length) await supabase.from('exchange_overrides').upsert(h.map(r => ({ currency: curr, date: this._toDbDate(r.data || r.date), buyValue: parseFloat((r.valor || r.value)?.buy || 0), sellValue: parseFloat((r.valor || r.value)?.sell || 0), source: 'BCB' })), { onConflict: 'currency,date' });
                } catch { }
            }
            const { data: final } = await supabase.from('exchange_overrides').select('*').eq('currency', curr).gte('date', dbStart).lte('date', dbEnd).order('date', { ascending: true });
            return (final || []).map(r => this._mapRate(r, true));
        } catch { return []; }
    }

    async fetchExchangeRates(currency) {
        if (!currency || currency === 'BRL') return [];
        const curr = currency.toUpperCase();
        if (SESSION_CACHE.exchange[curr] && Date.now() - SESSION_CACHE.exchange[curr].lastFetch < CACHE_TTL) return SESSION_CACHE.exchange[curr].data;
        const { data } = await supabase.from('exchange_overrides').select('*').eq('currency', curr).order('date', { ascending: false });
        const result = (data || []).map(r => this._mapRate(r, true));
        SESSION_CACHE.exchange[curr] = { data: result, lastFetch: Date.now() };
        return result;
    }

    async verifySeries(seriesId) {
        const today = new Date(), past = new Date(); past.setDate(today.getDate() - 10);
        const data = await this._robustFetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados?formato=json&dataInicial=${this._fmtDate(past)}&dataFinal=${this._fmtDate(today)}`);
        return data.reverse().slice(0, 5).map(i => ({ date: this._fromDbDate(i.data), value: this._normalizeValue(i.valor) }));
    }

    async getIndicatorConfigs() {
        try {
            const { data, error } = await supabase.from('indicator_config').select('*');
            if (error) throw error;
            return data?.length ? Object.fromEntries(data.map(i => [i.indicator, { seriesId: i.seriesId, label: i.label || i.indicator }])) : DEFAULT_INDICATORS;
        } catch { return DEFAULT_INDICATORS; }
    }

    async addIndicatorConfig(indicator, seriesId, label) {
        const { error } = await supabase.from('indicator_config').upsert({ indicator: indicator.toUpperCase(), seriesId: +seriesId, label: label || indicator.toUpperCase(), updatedAt: new Date().toISOString() });
        if (error) throw error;
        this._clearCache('indicators', indicator);
    }

    async removeIndicatorConfig(indicator) {
        const ind = indicator.toUpperCase();
        const { error } = await supabase.from('indicator_config').delete().eq('indicator', ind);
        if (error) throw error;
        await supabase.from('indicator_overrides').delete().eq('indicator', ind);
        this._clearCache('indicators', indicator);
    }

    async fetchIndicatorRates(indicator) {
        if (!indicator) return [];
        const ind = indicator.toUpperCase();
        try {
            if (SESSION_CACHE.indicators[ind] && Date.now() - SESSION_CACHE.indicators[ind].lastFetch < CACHE_TTL) return SESSION_CACHE.indicators[ind].data;
            const { data: stored, error } = await supabase.from('indicator_overrides').select('*').eq('indicator', ind).order('date', { ascending: true });
            if (error) throw error;
            const result = this._sortByDate((stored || []).map(r => ({ data: this._fromDbDate(r.date), valor: r.value, isOverridden: r.source === 'MANUAL', source: r.source })));
            SESSION_CACHE.indicators[ind] = { data: result, lastFetch: Date.now() };
            return result;
        } catch { return SESSION_CACHE.indicators[ind]?.data || []; }
    }

    async saveIndicatorOverride(indicator, date, value, source = 'MANUAL') {
        const ind = indicator.toUpperCase();
        const { error } = await supabase.from('indicator_overrides').upsert({ indicator: ind, date: this._toDbDate(date), value: parseFloat(value), source }, { onConflict: 'indicator,date' });
        if (error) throw error;
        this._clearCache('indicators', ind);
    }

    async removeIndicatorOverride(indicator, date) {
        const ind = indicator.toUpperCase();
        const { error } = await supabase.from('indicator_overrides').delete().eq('indicator', ind).eq('date', this._toDbDate(date));
        if (error) throw error;
        this._clearCache('indicators', ind);
    }

    async fetchIndicatorRateForMonth(indicator, month, year) {
        const config = (await this.getIndicatorConfigs())[indicator.toUpperCase()];
        if (!config) throw new Error('Indicator not configured');
        const lastDay = new Date(year, month, 0).getDate();
        const data = await this._robustFetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${config.seriesId}/dados?formato=json&dataInicial=01/${month}/${year}&dataFinal=${lastDay}/${month}/${year}`);
        return data?.length ? this._normalizeValue(data[0].valor) : null;
    }

    async syncDailyExchangeRates() {
        try {
            const today = new Date().toISOString().split('T')[0];
            if (sessionStorage.getItem('last_exchange_sync') === today) return { status: 'already_synced' };
            const currencies = Object.keys(await this.getManagedCurrencies()).filter(c => c !== 'BRL');
            if (!currencies.length) return { status: 'no_currencies' };
            const now = new Date(), ago = new Date(); ago.setDate(now.getDate() - 30);
            const [start, end] = [this._fmtDate(ago), this._fmtDate(now)];

            // Parallelize fetching
            const results = await Promise.allSettled(currencies.map(async c => {
                try {
                    const h = await this.fetchExchangeRatesForRange(start, end, c);
                    if (h?.length) {
                        await supabase.from('exchange_overrides').upsert(h.map(r => ({ currency: c.toUpperCase(), date: this._toDbDate(r.data || r.date), buyValue: parseFloat((r.valor || r.value)?.buy || 0), sellValue: parseFloat((r.valor || r.value)?.sell || 0), source: 'BCB' })), { onConflict: 'currency,date' });
                        return true;
                    }
                } catch { return false; }
            }));

            const count = results.filter(r => r.status === 'fulfilled' && r.value).length;

            sessionStorage.setItem('last_exchange_sync', today);
            this._clearCache('exchange');
            return { status: 'success', currenciesSynced: count };
        } catch (e) { throw e; }
    }
}

export const bcbService = new BCBService();
