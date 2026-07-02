const axios = require('axios');
const { query } = require('../config/database');
const cmc = require('../services/cmcService');
const logger = require('../config/logger');

const getActivePairs = async () => {
  return query("SELECT * FROM trading_pairs WHERE is_active = 1 ORDER BY sort_order ASC");
};

const validateSymbol = async (symbol) => {
  const [pair] = await query(
    "SELECT symbol FROM trading_pairs WHERE symbol = ? AND is_active = 1",
    [symbol?.toUpperCase()]
  );
  return pair ? pair.symbol : null;
};

exports.getAllTickers = async (req, res) => {
  try {
    const pairs = await getActivePairs();
    if (!pairs.length) return res.json({ success: true, data: [] });

    const symbols = pairs.map((p) => p.symbol);
    const tickers = await cmc.getAllTickers(symbols);

    const result = tickers.map((t) => {
      const pair = pairs.find((p) => p.symbol === t.symbol);
      const cmcPrice = parseFloat(t.price);
      return {
        ...t,
        buy_price:   pair ? (cmcPrice * (1 + parseFloat(pair.spread_buy))).toFixed(8)  : t.price,
        sell_price:  pair ? (cmcPrice * (1 - parseFloat(pair.spread_sell))).toFixed(8) : t.price,
        spread_buy:  pair?.spread_buy,
        spread_sell: pair?.spread_sell,
        is_spot:     pair?.is_spot,
        is_futures:  pair?.is_futures,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('AllTickers error:', err.message);
    res.status(502).json({ success: false, message: 'Failed to fetch tickers' });
  }
};

exports.getTicker = async (req, res) => {
  try {
    const symbol = await validateSymbol(req.params.symbol);
    if (!symbol) return res.status(400).json({ success: false, message: 'Unsupported symbol' });

    const [pair] = await query('SELECT * FROM trading_pairs WHERE symbol = ?', [symbol]);
    const ticker  = await cmc.getTicker(symbol);
    const cmcPrice = parseFloat(ticker.price);

    res.json({
      success: true,
      data: {
        ...ticker,
        buy_price:   (cmcPrice * (1 + parseFloat(pair.spread_buy))).toFixed(8),
        sell_price:  (cmcPrice * (1 - parseFloat(pair.spread_sell))).toFixed(8),
        spread_buy:  pair.spread_buy,
        spread_sell: pair.spread_sell,
      },
    });
  } catch (err) {
    logger.error('Ticker error:', err.message);
    res.status(502).json({ success: false, message: 'Failed to fetch ticker' });
  }
};

exports.getSymbols = async (req, res) => {
  try {
    const pairs = await getActivePairs();
    const data = pairs.map((p) => ({
      symbol:          p.symbol,
      base_currency:   p.base_coin,
      quote_currency:  'USDT',
      display_name:    p.display_name,
      is_spot:         !!p.is_spot,
      is_futures:      !!p.is_futures,
      max_leverage:    p.max_leverage,
      min_trade_usdt:  p.min_trade_usdt,
      max_trade_usdt:  p.max_trade_usdt,
      spread_buy:      p.spread_buy,
      spread_sell:     p.spread_sell,
      networks:        p.networks,
      has_memo:        !!p.has_memo,
    }));

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Symbols error:', err.message);
    res.status(502).json({ success: false, message: 'Failed to fetch symbols' });
  }
};

exports.getCandles = async (req, res) => {
  try {
    const symbol = await validateSymbol(req.params.symbol);
    if (!symbol) return res.status(400).json({ success: false, message: 'Unsupported symbol' });

    const VALID_INTERVALS = {
      '1min':  '1m',  '5min':  '5m',  '15min': '15m',
      '30min': '30m', '1hour': '1h',  '4hour': '4h',
      '1day':  '1d',  '1week': '1w',
    };
    const interval = VALID_INTERVALS[req.query.interval] || '1h';
    const limit    = Math.min(parseInt(req.query.limit) || 200, 1000);

    const binanceSymbol = symbol.replace('-', '');
    const { data } = await axios.get('https://api.binance.com/api/v3/klines', {
      params:  { symbol: binanceSymbol, interval, limit },
      timeout: 8000,
    });

    const candles = data.map((c) => ({
      time: Math.floor(parseInt(c[0]) / 1000),
      open: parseFloat(c[1]),
      high:     parseFloat(c[2]),
      low:      parseFloat(c[3]),
      close:    parseFloat(c[4]),
      volume:   parseFloat(c[5]),
    }));

    res.json({ success: true, data: { symbol, interval: req.query.interval || '1hour', candles } });
  } catch (err) {
    logger.error('Candles error:', err.message);
    res.status(502).json({ success: false, message: 'Failed to fetch candles' });
  }
};

exports.getOrderBook = async (req, res) => {
  try {
    const symbol = await validateSymbol(req.params.symbol);
    if (!symbol) return res.status(400).json({ success: false, message: 'Unsupported symbol' });

    const binanceSymbol = symbol.replace('-', '');
    const { data } = await axios.get('https://api.binance.com/api/v3/depth', {
      params:  { symbol: binanceSymbol, limit: 20 },
      timeout: 8000,
    });

    let bidTotal = 0, askTotal = 0;
    const bids = data.bids.map(([price, size]) => {
      bidTotal += parseFloat(size);
      return { price: parseFloat(price), size: parseFloat(size), total: parseFloat(bidTotal.toFixed(6)) };
    });
    const asks = data.asks.map(([price, size]) => {
      askTotal += parseFloat(size);
      return { price: parseFloat(price), size: parseFloat(size), total: parseFloat(askTotal.toFixed(6)) };
    });

    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const spread  = bestAsk && bestBid ? parseFloat((bestAsk - bestBid).toFixed(8)) : 0;

    res.json({
      success: true,
      data: { symbol, bids, asks, best_bid: bestBid, best_ask: bestAsk, spread, timestamp: Date.now() },
    });
  } catch (err) {
    logger.error('OrderBook error:', err.message);
    res.status(502).json({ success: false, message: 'Failed to fetch order book' });
  }
};

exports.getRecentTrades = async (req, res) => {
  try {
    const symbol = await validateSymbol(req.params.symbol);
    if (!symbol) return res.status(400).json({ success: false, message: 'Unsupported symbol' });

    const binanceSymbol = symbol.replace('-', '');
    const { data } = await axios.get('https://api.binance.com/api/v3/trades', {
      params:  { symbol: binanceSymbol, limit: 50 },
      timeout: 8000,
    });

    const trades = data.map((t) => ({
      id:      t.id,
      price:   parseFloat(t.price),
      size:    parseFloat(t.qty),
      side:    t.isBuyerMaker ? 'sell' : 'buy',
      time_ms: t.time,
    }));

    res.json({ success: true, data: { symbol, trades } });
  } catch (err) {
    logger.error('RecentTrades error:', err.message);
    res.status(502).json({ success: false, message: 'Failed to fetch trades' });
  }
};
