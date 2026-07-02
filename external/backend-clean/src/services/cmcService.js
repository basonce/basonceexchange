const axios = require('axios');
const logger = require('../config/logger');

const CMC_BASE = 'https://pro-api.coinmarketcap.com';
const CMC_KEY  = process.env.CMC_API_KEY;

const cache = new Map();
const CACHE_TTL = 30_000;

const isFresh = (ts) => Date.now() - ts < CACHE_TTL;

const fetchQuotes = async (symbols) => {
  const { data } = await axios.get(`${CMC_BASE}/v1/cryptocurrency/quotes/latest`, {
    headers: { 'X-CMC_PRO_API_KEY': CMC_KEY },
    params:  { symbol: symbols.join(','), convert: 'USDT' },
    timeout: 8000,
  });
  return data.data;
};

const getTicker = async (symbol) => {
  const base = symbol.split('-')[0].toUpperCase();

  if (cache.has(base) && isFresh(cache.get(base).ts)) {
    return cache.get(base).data;
  }

  const raw = await fetchQuotes([base]);
  const coin = raw[base];
  if (!coin) throw new Error(`CMC: symbol ${base} not found`);

  const q = coin.quote.USDT;
  const result = {
    symbol:         `${base}-USDT`,
    price:          q.price.toString(),
    change_percent: q.percent_change_24h,
    change_price:   q.price * (q.percent_change_24h / 100),
    high_24h: null,
    low_24h: null,
    volume_24h:     q.volume_24h,
    market_cap:     q.market_cap,
    last_updated:   new Date(q.last_updated).getTime(),
  };

  cache.set(base, { data: result, ts: Date.now() });
  return result;
};

const getAllTickers = async (symbols) => {
  const bases = symbols.map((s) => s.split('-')[0].toUpperCase());

  const toFetch = bases.filter((b) => !cache.has(b) || !isFresh(cache.get(b).ts));

  if (toFetch.length > 0) {
    try {
      const raw = await fetchQuotes(toFetch);
      for (const [base, coin] of Object.entries(raw)) {
        const q = coin.quote.USDT;
        cache.set(base, {
          ts: Date.now(),
          data: {
            symbol:         `${base}-USDT`,
            price:          q.price.toString(),
            change_percent: q.percent_change_24h,
            volume_24h:     q.volume_24h,
            market_cap:     q.market_cap,
            last_updated:   new Date(q.last_updated).getTime(),
          },
        });
      }
    } catch (err) {
      logger.error('CMC getAllTickers error:', err.message);
    }
  }

  return bases.map((b) => cache.get(b)?.data).filter(Boolean);
};

module.exports = { getTicker, getAllTickers };
