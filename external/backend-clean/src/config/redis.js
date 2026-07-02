const { createClient } = require('redis');
const logger = require('./logger');

let client = null;
let isConnected = false;

const getRedisClient = async () => {
  if (client && isConnected) return client;

  client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

  client.on('error', (err) => logger.error('Redis error:', err));
  client.on('connect', () => { isConnected = true; logger.info('Redis connected'); });
  client.on('disconnect', () => { isConnected = false; });

  await client.connect();
  return client;
};

const memoryStore = new Map();

const cache = {
  async set(key, value, ttlSeconds = 3600) {
    try {
      const r = await getRedisClient();
      await r.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch {
      memoryStore.set(key, { value, exp: Date.now() + ttlSeconds * 1000 });
    }
  },
  async get(key) {
    try {
      const r = await getRedisClient();
      const val = await r.get(key);
      return val ? JSON.parse(val) : null;
    } catch {
      const item = memoryStore.get(key);
      if (!item) return null;
      if (Date.now() > item.exp) { memoryStore.delete(key); return null; }
      return item.value;
    }
  },
  async del(key) {
    try {
      const r = await getRedisClient();
      await r.del(key);
    } catch {
      memoryStore.delete(key);
    }
  },
  async exists(key) {
    try {
      const r = await getRedisClient();
      return (await r.exists(key)) === 1;
    } catch {
      const item = memoryStore.get(key);
      if (!item) return false;
      if (Date.now() > item.exp) { memoryStore.delete(key); return false; }
      return true;
    }
  },
};

module.exports = { getRedisClient, cache };
