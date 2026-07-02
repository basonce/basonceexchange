const axios  = require('axios');
const logger = require('../config/logger');

const API_KEY = process.env.NOWNODES_API_KEY || '';

const BLOCKBOOK_URLS = {
  BTC:  'https://btcbook.nownodes.io/api/v2',
  LTC:  'https://ltcbook.nownodes.io/api/v2',
  DOGE: 'https://dogebook.nownodes.io/api/v2',
  DASH: 'https://dashbook.nownodes.io/api/v2',
  ZEC:  'https://zecbook.nownodes.io/api/v2',
  DGB:  'https://dgbbook.nownodes.io/api/v2',
  ETH:  'https://ethbook.nownodes.io/api/v2',
  BSC: 'https://bscbook.nownodes.io/api/v2',
  TRX: 'https://trxbook.nownodes.io/api/v2',
  XRP:  'https://xrpbook.nownodes.io/api/v2',
  SOL:  'https://solbook.nownodes.io/api/v2',
  ALGO: 'https://algobook.nownodes.io/api/v2',
};

const coinToBlockbook = (coin, network) => {
  const c = coin.toUpperCase();
  const n = (network || '').toLowerCase();
  if (c === 'USDT' || c === 'WIN') {
    if (['trx','trc20'].includes(n)) return 'TRX';
    if (['bsc','bep20'].includes(n)) return 'BSC';
    return 'ETH';
  }
  if (c === 'BNB') return 'BSC';
  if (c === 'ONE')
    return 'ETH';
  return c;
};

const bbHeaders = () => ({
  'api-key': API_KEY,
  'Content-Type': 'application/json',
});

const bbGet = async (chain, path) => {
  const base = BLOCKBOOK_URLS[chain];
  if (!base) throw new Error(`No Blockbook URL for chain: ${chain}`);
  try {
    const { data } = await axios.get(`${base}${path}`, {
      headers: bbHeaders(),
      timeout: 15000,
    });
    return data;
  } catch (err) {
    logger.error(`[nownodes] Blockbook ${chain} ${path}: ${err.message}`);
    throw err;
  }
};

const RPC_URLS = {
  BTC:  'https://btc.nownodes.io',
  LTC:  'https://ltc.nownodes.io',
  DOGE: 'https://doge.nownodes.io',
  DASH: 'https://dash.nownodes.io',
  ZEC:  'https://zec.nownodes.io',
  DGB:  'https://dgb.nownodes.io',
  ETH:  'https://eth.nownodes.io',
  BSC:  'https://bsc.nownodes.io',
  TRX:  'https://trx.nownodes.io',
  XRP:  'https://xrp.nownodes.io',
  SOL:  'https://sol.nownodes.io',
  ALGO: 'https://algo.nownodes.io',
};

const rpcPost = async (chain, method, params = []) => {
  const url = RPC_URLS[chain];
  if (!url) throw new Error(`No RPC URL for chain: ${chain}`);
  const { data } = await axios.post(
    url,
    { jsonrpc: '2.0', id: 1, method, params },
    { headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' }, timeout: 15000 }
  );
  if (data.error) throw new Error(`RPC error: ${JSON.stringify(data.error)}`);
  return data.result;
};

const getAddressTransactions = async (coin, network, address) => {
  const chain = coinToBlockbook(coin, network);
  try {
    const data = await bbGet(chain, `/address/${address}?details=txs&pageSize=50`);
    const txs  = data.transactions || [];

    return txs.map(tx => {
      const coinUp = coin.toUpperCase();
      if (['USDT', 'WIN'].includes(coinUp) && tx.tokenTransfers?.length) {
        const transfer = tx.tokenTransfers.find(t =>
          t.to?.toLowerCase() === address.toLowerCase()
        );
        if (transfer) {
          return {
            txid:          tx.txid,
            amount:        parseFloat(transfer.value) / Math.pow(10, parseInt(transfer.decimals || 6)),
            confirmations: tx.confirmations || 0,
            blockTime:     tx.blockTime,
            from:          transfer.from,
            to:            transfer.to,
            isToken:       true,
            tokenSymbol:   transfer.symbol,
          };
        }
        return null;
      }

      const output = (tx.vout || tx.outputs || []).find(o =>
        o.addresses?.includes(address) || o.address === address
      );
      if (!output) return null;

      return {
        txid:          tx.txid,
        amount: parseFloat(output.value) / 1e8,
        confirmations: tx.confirmations || 0,
        blockTime:     tx.blockTime,
        from:          (tx.vin?.[0]?.addresses || tx.inputs?.[0]?.addresses || ['unknown'])[0],
        to:            address,
        isToken:       false,
      };
    }).filter(Boolean);
  } catch (err) {
    logger.error(`[nownodes] getAddressTransactions ${coin}/${address}: ${err.message}`);
    return [];
  }
};

const broadcastTransaction = async (coin, network, rawTxHex) => {
  const chain = coinToBlockbook(coin, network);

  const base = BLOCKBOOK_URLS[chain];
  const { data } = await axios.get(`${base}/sendtx/${rawTxHex}`, {
    headers: bbHeaders(),
    timeout: 30000,
  });
  if (data.error) throw new Error(`Broadcast error: ${data.error}`);
  return data.result;
};

const getFeeRate = async (coin, network) => {
  const chain = coinToBlockbook(coin, network);
  try {
    const data = await bbGet(chain, '/estimatefee/5');
    return data.result || '0.00001';
  } catch {
    return '0.00001';
  }
};

const getAddressBalance = async (coin, network, address) => {
  const chain = coinToBlockbook(coin, network);
  try {
    const data = await bbGet(chain, `/address/${address}`);
    return {
      confirmed:   parseFloat(data.balance   || 0) / 1e8,
      unconfirmed: parseFloat(data.unconfirmedBalance || 0) / 1e8,
    };
  } catch {
    return { confirmed: 0, unconfirmed: 0 };
  }
};

module.exports = {
  getAddressTransactions,
  broadcastTransaction,
  getFeeRate,
  getAddressBalance,
  coinToBlockbook,
};
