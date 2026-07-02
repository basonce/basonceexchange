const { query, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

const getOrCreateWallet = async (userId) => {
  let [wallet] = await query('SELECT * FROM wallets WHERE user_id = ?', [userId]);
  if (!wallet) {
    const id = uuidv4();
    await query('INSERT INTO wallets (id, user_id, balance, locked) VALUES (?, ?, 0, 0)', [id, userId]);
    [wallet] = await query('SELECT * FROM wallets WHERE id = ?', [id]);
  }
  return wallet;
};

const getBalance = async (userId) => {
  const wallet = await getOrCreateWallet(userId);
  return {
    balance:   parseFloat(wallet.balance),
    locked:    parseFloat(wallet.locked),
    available: parseFloat(wallet.balance) - parseFloat(wallet.locked),
  };
};

const creditBalance = async (conn, userId, amount, type, refType, refId, description) => {
  const [wallet] = await conn.execute('SELECT * FROM wallets WHERE user_id = ? FOR UPDATE', [userId]);
  if (!wallet.length) throw new Error('Wallet not found');

  const w      = wallet[0];
  const before = parseFloat(w.balance);
  const after  = before + parseFloat(amount);

  await conn.execute('UPDATE wallets SET balance = ? WHERE user_id = ?', [after.toFixed(8), userId]);
  await conn.execute(
    'INSERT INTO wallet_transactions (id, user_id, type, amount, balance_before, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), userId, type, amount, before.toFixed(8), after.toFixed(8), refType, refId, description]
  );
  return after;
};

const debitBalance = async (conn, userId, amount, type, refType, refId, description) => {
  const [wallet] = await conn.execute('SELECT * FROM wallets WHERE user_id = ? FOR UPDATE', [userId]);
  if (!wallet.length) throw new Error('Wallet not found');

  const w      = wallet[0];
  const before = parseFloat(w.balance);
  const amt    = parseFloat(amount);

  if (before < amt) throw new Error('Insufficient balance');

  const after = before - amt;
  await conn.execute('UPDATE wallets SET balance = ? WHERE user_id = ?', [after.toFixed(8), userId]);
  await conn.execute(
    'INSERT INTO wallet_transactions (id, user_id, type, amount, balance_before, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), userId, type, amt, before.toFixed(8), after.toFixed(8), refType, refId, description]
  );
  return after;
};

const lockFunds = async (conn, userId, amount) => {
  const [wallet] = await conn.execute('SELECT * FROM wallets WHERE user_id = ? FOR UPDATE', [userId]);
  if (!wallet.length) throw new Error('Wallet not found');
  const w         = wallet[0];
  const available = parseFloat(w.balance) - parseFloat(w.locked);
  if (available < parseFloat(amount)) throw new Error('Insufficient available balance');
  await conn.execute('UPDATE wallets SET locked = locked + ? WHERE user_id = ?', [amount, userId]);
};

const unlockAndDebit = async (conn, userId, amount) => {
  await conn.execute('UPDATE wallets SET balance = balance - ?, locked = locked - ? WHERE user_id = ?', [amount, amount, userId]);
};

const unlockFunds = async (conn, userId, amount) => {
  await conn.execute('UPDATE wallets SET locked = locked - ? WHERE user_id = ?', [amount, userId]);
};

const getTransactionHistory = async (userId, { page = 1, limit = 20, type } = {}) => {
  const offset = (page - 1) * limit;
  let sql = 'SELECT * FROM wallet_transactions WHERE user_id = ?';
  const params = [userId];
  if (type) { sql += ' AND type = ?'; params.push(type); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const [rows, [{ total }]] = await Promise.all([
    query(sql, params),
    query('SELECT COUNT(*) as total FROM wallet_transactions WHERE user_id = ?' + (type ? ' AND type = ?' : ''), type ? [userId, type] : [userId]),
  ]);
  return { transactions: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) };
};

const getOrCreateAsset = async (userId, coin) => {
  const upperCoin = coin.toUpperCase();
  let [asset] = await query(
    'SELECT * FROM user_assets WHERE user_id = ? AND coin = ?',
    [userId, upperCoin]
  );
  if (!asset) {
    const id = uuidv4();
    await query(
      'INSERT INTO user_assets (id, user_id, coin, balance, locked) VALUES (?, ?, ?, 0, 0)',
      [id, userId, upperCoin]
    );
    [asset] = await query('SELECT * FROM user_assets WHERE id = ?', [id]);
  }
  return asset;
};

const getAssetBalance = async (userId, coin) => {
  const asset = await getOrCreateAsset(userId, coin.toUpperCase());
  return {
    coin:      asset.coin,
    balance:   parseFloat(asset.balance),
    locked:    parseFloat(asset.locked),
    available: parseFloat(asset.balance) - parseFloat(asset.locked),
  };
};

const creditAsset = async (conn, userId, coin, amount) => {
  const upperCoin = coin.toUpperCase();

  await conn.execute(
    `INSERT INTO user_assets (id, user_id, coin, balance, locked)
     VALUES (?, ?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance)`,
    [uuidv4(), userId, upperCoin, parseFloat(amount).toFixed(8)]
  );
};

const debitAsset = async (conn, userId, coin, amount) => {
  const upperCoin = coin.toUpperCase();
  const amt       = parseFloat(amount);

  const [[assetRow]] = await conn.execute(
    'SELECT * FROM user_assets WHERE user_id = ? AND coin = ? FOR UPDATE',
    [userId, upperCoin]
  );

  if (!assetRow) throw new Error(`No ${upperCoin} holdings found`);

  const available = parseFloat(assetRow.balance) - parseFloat(assetRow.locked);
  if (available < amt) {
    throw new Error(`Insufficient ${upperCoin} balance (available: ${available.toFixed(8)}, required: ${amt.toFixed(8)})`);
  }

  await conn.execute(
    'UPDATE user_assets SET balance = balance - ? WHERE user_id = ? AND coin = ?',
    [amt.toFixed(8), userId, upperCoin]
  );
};

const getAllAssets = async (userId) => {
  const assets = await query(
    'SELECT * FROM user_assets WHERE user_id = ? AND balance > 0 ORDER BY coin ASC',
    [userId]
  );
  return assets.map(a => ({
    coin:      a.coin,
    balance:   parseFloat(a.balance),
    locked:    parseFloat(a.locked),
    available: parseFloat(a.balance) - parseFloat(a.locked),
  }));
};

module.exports = {
  getOrCreateWallet,
  getBalance,
  creditBalance,
  debitBalance,
  lockFunds,
  unlockAndDebit,
  unlockFunds,
  getTransactionHistory,
  getOrCreateAsset,
  getAssetBalance,
  creditAsset,
  debitAsset,
  getAllAssets,
};
