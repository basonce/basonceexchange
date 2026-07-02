const axios = require('axios');
const crypto = require('crypto');
const logger = require('../config/logger');

const BASE_URL = process.env.KUCOIN_BASE_URL || 'https://api.kucoin.com';
const API_KEY = process.env.KUCOIN_API_KEY;
const API_SECRET = process.env.KUCOIN_API_SECRET;
const PASSPHRASE = process.env.KUCOIN_PASSPHRASE;

const SUPPORTED_PEERS = (process.env.SUPPORTED_PEERS || 'BTC,ETH,BNB,XRP,ADA,SOL,DOGE,TRX,LTC,ATOM,ALGO,ZEC,WIN,ONE,DAG,DASH,DGB').split(',');

const sign = (timestamp, method, endpoint, body = '') => {
  const str = `${timestamp}${method}${endpoint}${body}`;
  return crypto.createHmac('sha256', API_SECRET).update(str).digest('base64');
};

const signPassphrase = () =>
  crypto.createHmac('sha256', API_SECRET).update(PASSPHRASE).digest('base64');

const getHeaders = (method, endpoint, body = '') => {
  const timestamp = Date.now().toString();
  return {
    'KC-API-KEY': API_KEY,
    'KC-API-SIGN': sign(timestamp, method, endpoint, body),
    'KC-API-TIMESTAMP': timestamp,
    'KC-API-PASSPHRASE': signPassphrase(),
    'KC-API-KEY-VERSION': '2',
    'Content-Type': 'application/json',
  };
};

const kucoinRequest = async (method, endpoint, data = null) => {
  const body = data ? JSON.stringify(data) : '';
  const headers = getHeaders(method.toUpperCase(), endpoint, body);
  try {
    const resp = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      headers,
      data: data || undefined,
      timeout: 10000,
    });
    if (resp.data.code !== '200000') {
      throw new Error(`KuCoin error ${resp.data.code}: ${resp.data.msg}`);
    }
    return resp.data.data;
  } catch (err) {
    logger.error('KuCoin API error:', { endpoint, msg: err.message });
    throw err;
  }
};

const getDepositAddress = async (coin, network) => {
  return kucoinRequest('GET', `/api/v1/deposit-addresses?currency=${coin}&chain=${network}`);
};

const createDepositAddress = async (coin, network) => {
  return kucoinRequest('POST', '/api/v1/deposit-addresses', { currency: coin, chain: network });
};

const getAccountBalance = async (currency = 'USDT', type = 'trade') => {
  const accounts = await kucoinRequest('GET', `/api/v1/accounts?currency=${currency}&type=${type}`);
  return accounts && accounts.length > 0 ? accounts[0] : { available: '0', holds: '0', balance: '0' };
};

const getAllBalances = async () => {
  return kucoinRequest('GET', '/api/v1/accounts');
};

const getTicker = async (symbol) => {
  const resp = await axios.get(`${BASE_URL}/api/v1/market/orderbook/level1?symbol=${symbol}`, { timeout: 5000 });
  return resp.data.data;
};

const placeOrder = async ({ clientOid, side, symbol, type, price, size, funds }) => {
  const body = { clientOid, side, symbol, type: type || 'market' };
  if (type === 'limit') { body.price = price; body.size = size; }
  else { if (side === 'buy') body.funds = funds; else body.size = size; }
  return kucoinRequest('POST', '/api/v1/orders', body);
};

const getOrder = async (orderId) => {
  return kucoinRequest('GET', `/api/v1/orders/${orderId}`);
};

const cancelOrder = async (orderId) => {
  return kucoinRequest('DELETE', `/api/v1/orders/${orderId}`);
};

const withdraw = async ({ currency, address, amount, memo, chain, remark }) => {
  return kucoinRequest('POST', '/api/v1/withdrawals', { currency, address, amount: String(amount), memo, chain, remark });
};

const getWithdrawal = async (withdrawalId) => {
  return kucoinRequest('GET', `/api/v1/withdrawals?id=${withdrawalId}`);
};

const getDepositHistory = async (currency, status) => {
  let ep = `/api/v1/deposits?currency=${currency}`;
  if (status) ep += `&status=${status}`;
  return kucoinRequest('GET', ep);
};

const PEER_NETWORKS = {
  BTC:  { name: 'Bitcoin',       networks: [{ id: 'btc',  label: 'Bitcoin (BTC)' }],                                                                          minDeposit: 0.0001, minWithdraw: 0.001,  withdrawFee: 0.0005 },
  USDT: { name: 'Tether USD',    networks: [{ id: 'eth',  label: 'Ethereum (ERC20)' }, { id: 'trx', label: 'Tron (TRC20)' }, { id: 'bsc', label: 'BNB Smart Chain (BEP20)' }], minDeposit: 1, minWithdraw: 10, withdrawFee: 1 },
  ETH:  { name: 'Ethereum',      networks: [{ id: 'eth',  label: 'Ethereum (ERC20)' }],                                                                       minDeposit: 0.01,   minWithdraw: 0.01,   withdrawFee: 0.005  },
  BNB:  { name: 'BNB',           networks: [{ id: 'bsc',  label: 'BSC (BEP20)' }, { id: 'bnb', label: 'BNB Chain' }],                                        minDeposit: 0.01,   minWithdraw: 0.01,   withdrawFee: 0.001  },
  XRP:  { name: 'XRP',           networks: [{ id: 'xrp',  label: 'XRP Ledger' }],                                                                             minDeposit: 1,      minWithdraw: 1,      withdrawFee: 0.25,  hasMemo: true },
  ADA:  { name: 'Cardano',       networks: [{ id: 'ada',  label: 'Cardano' }],                                                                                minDeposit: 1,      minWithdraw: 1,      withdrawFee: 1      },
  SOL:  { name: 'Solana',        networks: [{ id: 'sol',  label: 'Solana' }],                                                                                 minDeposit: 0.01,   minWithdraw: 0.01,   withdrawFee: 0.01   },
  DOGE: { name: 'Dogecoin',      networks: [{ id: 'doge', label: 'Dogecoin' }],                                                                               minDeposit: 10,     minWithdraw: 10,     withdrawFee: 5      },
  TRX:  { name: 'TRON',          networks: [{ id: 'trx',  label: 'TRC20' }],                                                                                  minDeposit: 1,      minWithdraw: 1,      withdrawFee: 1      },
  LTC:  { name: 'Litecoin',      networks: [{ id: 'ltc',  label: 'Litecoin' }],                                                                               minDeposit: 0.01,   minWithdraw: 0.01,   withdrawFee: 0.001  },
  ATOM: { name: 'Cosmos',        networks: [{ id: 'atom', label: 'Cosmos Hub' }],                                                                             minDeposit: 0.1,    minWithdraw: 0.1,    withdrawFee: 0.01,  hasMemo: true },
  ALGO: { name: 'Algorand',      networks: [{ id: 'algo', label: 'Algorand' }],                                                                               minDeposit: 1,      minWithdraw: 1,      withdrawFee: 0.1    },
  ZEC:  { name: 'Zcash',         networks: [{ id: 'zec',  label: 'Zcash' }],                                                                                  minDeposit: 0.001,  minWithdraw: 0.001,  withdrawFee: 0.0005 },
  WIN:  { name: 'WINkLink',      networks: [{ id: 'trx',  label: 'TRC20' }],                                                                                  minDeposit: 100,    minWithdraw: 100,    withdrawFee: 50     },
  ONE:  { name: 'Harmony',       networks: [{ id: 'one',  label: 'Harmony ONE' }],                                                                            minDeposit: 1,      minWithdraw: 1,      withdrawFee: 0.1    },
  DAG:  { name: 'Constellation', networks: [{ id: 'dag',  label: 'DAG' }],                                                                                    minDeposit: 1,      minWithdraw: 1,      withdrawFee: 0.5    },
  DASH: { name: 'Dash',          networks: [{ id: 'dash', label: 'Dash' }],                                                                                   minDeposit: 0.01,   minWithdraw: 0.01,   withdrawFee: 0.005  },
  DGB:  { name: 'DigiByte',      networks: [{ id: 'dgb',  label: 'DigiByte' }],                                                                               minDeposit: 10,     minWithdraw: 10,     withdrawFee: 1      },
};

const getSupportedPeers = () => PEER_NETWORKS;
const isPeerSupported = (coin) => !!PEER_NETWORKS[coin?.toUpperCase()];
const getPeerInfo = (coin) => PEER_NETWORKS[coin?.toUpperCase()] || null;

module.exports = {
  getDepositAddress, createDepositAddress,
  getAccountBalance, getAllBalances,
  getTicker, placeOrder, getOrder, cancelOrder,
  withdraw, getWithdrawal,
  getDepositHistory,
  getSupportedPeers, isPeerSupported, getPeerInfo,
  SUPPORTED_PEERS,
};
