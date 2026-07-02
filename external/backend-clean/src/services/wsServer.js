const WebSocket = require('ws');
const axios = require('axios');
const logger = require('../config/logger');

const SUPPORTED_SYMBOLS = [
  'BTC-USDT','ETH-USDT','BNB-USDT','XRP-USDT','ADA-USDT',
  'SOL-USDT','DOGE-USDT','TRX-USDT','LTC-USDT','MATIC-USDT',
];

const CHANNEL_MAP = {
  ticker:    (sym) => `/market/ticker:${sym}`,
  orderbook: (sym) => `/market/level2Depth50:${sym}`,
  trades:    (sym) => `/market/match:${sym}`,
  candles:   (sym) => `/market/candles:${sym}_1hour`,
};

let kcWs = null;
let pingInterval = null;

const subscriptions = new Map();

const getKucoinWsToken = async () => {
  const { data } = await axios.post('https://api.kucoin.com/api/v1/bullet-public', {}, { timeout: 8000 });
  const server = data.data.instanceServers[0];
  return {
    endpoint: server.endpoint,
    token:    data.data.token,
    pingInterval: server.pingInterval,
  };
};

const kcSend = (msg) => {
  if (kcWs && kcWs.readyState === WebSocket.OPEN) {
    kcWs.send(JSON.stringify(msg));
  }
};

const kcSubscribe = (topic) => {
  kcSend({ id: Date.now().toString(), type: 'subscribe', topic, privateChannel: false, response: true });
};

const kcUnsubscribe = (topic) => {
  kcSend({ id: Date.now().toString(), type: 'unsubscribe', topic, privateChannel: false, response: true });
};

const broadcast = (topic, payload) => {
  const clients = subscriptions.get(topic);
  if (!clients || clients.size === 0) return;
  const msg = JSON.stringify(payload);
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
};

const parseKcMessage = (raw) => {
  if (raw.type !== 'message') return null;
  const topic = raw.topic || '';
  const d = raw.data;

  if (topic.startsWith('/market/ticker:')) {
    const symbol = topic.split(':')[1];
    return { topic, type: 'ticker', symbol, data: {
      price:          parseFloat(d.price),
      best_bid:       parseFloat(d.bestBid),
      best_ask:       parseFloat(d.bestAsk),
      change_percent: parseFloat(d.changeRate) * 100,
      change_price:   parseFloat(d.changePrice),
      high_24h:       parseFloat(d.high24h),
      low_24h:        parseFloat(d.low24h),
      volume_24h:     parseFloat(d.vol24h || d.vol),
    }};
  }

  if (topic.startsWith('/market/level2Depth50:')) {
    const symbol = topic.split(':')[1];
    return { topic, type: 'orderbook', symbol, data: {
      bids: (d.bids || []).map(([p, s]) => ({ price: parseFloat(p), size: parseFloat(s) })),
      asks: (d.asks || []).map(([p, s]) => ({ price: parseFloat(p), size: parseFloat(s) })),
      timestamp: d.timestamp,
    }};
  }

  if (topic.startsWith('/market/match:')) {
    const symbol = topic.split(':')[1];
    return { topic, type: 'trade', symbol, data: {
      price:   parseFloat(d.price),
      size:    parseFloat(d.size),
      side:    d.side,
      time_ms: Math.floor(parseInt(d.time) / 1e6),
    }};
  }

  if (topic.startsWith('/market/candles:')) {
    const [sym] = topic.split(':')[1].split('_');
    const c = d.candles;
    return { topic, type: 'candle', symbol: sym, data: {
      time:    parseInt(c[0]),
      open:    parseFloat(c[1]),
      close:   parseFloat(c[2]),
      high:    parseFloat(c[3]),
      low:     parseFloat(c[4]),
      volume:  parseFloat(c[5]),
    }};
  }

  return null;
};

const connectToKucoin = async () => {
  try {
    const { endpoint, token, pingInterval: pi } = await getKucoinWsToken();
    const wsUrl = `${endpoint}?token=${token}&connectId=${Date.now()}`;

    kcWs = new WebSocket(wsUrl);

    kcWs.on('open', () => {
      logger.info('KuCoin WS connected');

      subscriptions.forEach((clients, topic) => {
        if (clients.size > 0) kcSubscribe(topic);
      });

      pingInterval = setInterval(() => {
        kcSend({ id: Date.now().toString(), type: 'ping' });
      }, pi || 20000);
    });

    kcWs.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const parsed = parseKcMessage(msg);
        if (parsed) broadcast(parsed.topic, { type: parsed.type, symbol: parsed.symbol, data: parsed.data });
      } catch {}
    });

    kcWs.on('close', () => {
      logger.warn('KuCoin WS disconnected, reconnecting in 3s...');
      clearInterval(pingInterval);
      setTimeout(connectToKucoin, 3000);
    });

    kcWs.on('error', (err) => {
      logger.error('KuCoin WS error:', err.message);
      kcWs.close();
    });

  } catch (err) {
    logger.error('KuCoin WS connect failed:', err.message);
    setTimeout(connectToKucoin, 5000);
  }
};

const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  connectToKucoin();

  wss.on('connection', (ws, req) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.info(`WS client connected from ${ip}`);

    ws.subscribedTopics = new Set();

    ws.send(JSON.stringify({ type: 'connected', message: 'Connected to market feed' }));

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const { action, channel, symbol } = msg;

        if (!action || !channel || !symbol) return;

        const sym = symbol.toUpperCase();
        if (!SUPPORTED_SYMBOLS.includes(sym)) {
          ws.send(JSON.stringify({ type: 'error', message: `Symbol ${sym} not supported` }));
          return;
        }

        const topicFn = CHANNEL_MAP[channel];
        if (!topicFn) {
          ws.send(JSON.stringify({ type: 'error', message: `Channel ${channel} not supported` }));
          return;
        }

        const topic = topicFn(sym);

        if (action === 'subscribe') {
          if (!subscriptions.has(topic)) subscriptions.set(topic, new Set());
          const hadClients = subscriptions.get(topic).size > 0;
          subscriptions.get(topic).add(ws);
          ws.subscribedTopics.add(topic);

          if (!hadClients)
            kcSubscribe(topic);

          ws.send(JSON.stringify({ type: 'subscribed', channel, symbol: sym }));
        }

        if (action === 'unsubscribe') {
          if (subscriptions.has(topic)) {
            subscriptions.get(topic).delete(ws);
            ws.subscribedTopics.delete(topic);
            if (subscriptions.get(topic).size === 0) {
              subscriptions.delete(topic);
              kcUnsubscribe(topic);
            }
          }
        }

      } catch {}
    });

    ws.on('close', () => {
      ws.subscribedTopics.forEach((topic) => {
        if (subscriptions.has(topic)) {
          subscriptions.get(topic).delete(ws);
          if (subscriptions.get(topic).size === 0) {
            subscriptions.delete(topic);
            kcUnsubscribe(topic);
          }
        }
      });
      logger.info(`WS client disconnected from ${ip}`);
    });

    ws.on('error', () => ws.close());
  });

  logger.info('WebSocket server ready at /ws');
  return wss;
};

module.exports = { setupWebSocket };
