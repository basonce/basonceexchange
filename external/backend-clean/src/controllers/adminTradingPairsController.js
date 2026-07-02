const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const cmc = require('../services/cmcService');
const logger = require('../config/logger');

exports.getAll = async (req, res) => {
  try {
    const pairs = await query('SELECT * FROM trading_pairs ORDER BY sort_order ASC, created_at ASC');
    res.json({ success: true, data: pairs });
  } catch (err) {
    logger.error('Admin get trading pairs error:', err);
    res.status(500).json({ success: false, message: 'Failed to get trading pairs' });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      symbol,
      base_coin,
      display_name,
      cmc_id,
      is_active   = 1,
      is_spot     = 1,
      is_futures  = 1,
      spread_buy  = 0.01,
      spread_sell = 0.01,
      manual_price,
      min_trade_usdt = 1,
      max_trade_usdt = 100000,
      max_leverage   = 100,
      min_deposit,
      min_withdraw,
      withdraw_fee,
      has_memo = 0,
      networks,
      sort_order = 0,
    } = req.body;

    if (!symbol || !base_coin || !display_name) {
      return res.status(400).json({ success: false, message: 'symbol, base_coin, display_name are required' });
    }

    const sym = symbol.toUpperCase();
    const base = base_coin.toUpperCase();

    const [existing] = await query('SELECT id FROM trading_pairs WHERE symbol = ?', [sym]);
    if (existing) {
      return res.status(409).json({ success: false, message: `${sym} already exists` });
    }

    if (!manual_price) {
      try {
        await cmc.getTicker(`${base}-USDT`);
      } catch {
        return res.status(400).json({
          success: false,
          message: `Could not find ${base} on CoinMarketCap. Use manual_price instead.`,
        });
      }
    }

    const networksJson = networks
      ? (typeof networks === 'string' ? networks : JSON.stringify(networks))
      : null;

    const id = uuidv4();
    await query(
      `INSERT INTO trading_pairs
        (id, symbol, base_coin, cmc_id, display_name, is_active, is_spot, is_futures,
         spread_buy, spread_sell, manual_price, min_trade_usdt, max_trade_usdt, max_leverage,
         min_deposit, min_withdraw, withdraw_fee, has_memo, networks, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, sym, base, cmc_id || null, display_name, is_active, is_spot, is_futures,
       spread_buy, spread_sell, manual_price || null, min_trade_usdt, max_trade_usdt, max_leverage,
       min_deposit || null, min_withdraw || null, withdraw_fee || null, has_memo,
       networksJson, sort_order]
    );

    const [pair] = await query('SELECT * FROM trading_pairs WHERE id = ?', [id]);
    res.status(201).json({ success: true, message: 'Trading pair created', data: pair });
  } catch (err) {
    logger.error('Admin create trading pair error:', err);
    res.status(500).json({ success: false, message: 'Failed to create trading pair' });
  }
};

exports.update = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const [pair] = await query('SELECT * FROM trading_pairs WHERE symbol = ?', [symbol]);
    if (!pair) return res.status(404).json({ success: false, message: 'Trading pair not found' });

    const allowed = [
      'display_name', 'is_active', 'is_spot', 'is_futures',
      'spread_buy', 'spread_sell', 'manual_price',
      'min_trade_usdt', 'max_trade_usdt', 'max_leverage',
      'min_deposit', 'min_withdraw', 'withdraw_fee',
      'has_memo', 'networks', 'sort_order', 'cmc_id',
    ];

    const updates = [];
    const values  = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        let val = req.body[key];
        if (key === 'networks' && typeof val !== 'string') val = JSON.stringify(val);
        if (key === 'manual_price' && (val === '' || val === null)) val = null;
        updates.push(`${key} = ?`);
        values.push(val);
      }
    }

    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    values.push(symbol);
    await query(`UPDATE trading_pairs SET ${updates.join(', ')}, updated_at = NOW() WHERE symbol = ?`, values);

    const [updated] = await query('SELECT * FROM trading_pairs WHERE symbol = ?', [symbol]);
    res.json({ success: true, message: 'Trading pair updated', data: updated });
  } catch (err) {
    logger.error('Admin update trading pair error:', err);
    res.status(500).json({ success: false, message: 'Failed to update trading pair' });
  }
};

exports.remove = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const [pair] = await query('SELECT * FROM trading_pairs WHERE symbol = ?', [symbol]);
    if (!pair)
      return res.status(404).json({ success: false, message: 'Trading pair not found' });

    const [{ cnt }] = await query(
      "SELECT COUNT(*) as cnt FROM trades WHERE symbol = ? AND status IN ('open','pending')",
      [symbol]
    );
    if (cnt > 0) {
      await query("UPDATE trading_pairs SET is_active = 0 WHERE symbol = ?", [symbol]);
      return res.json({ success: true, message: `${symbol} deactivated (has open orders)` });
    }

    await query('DELETE FROM trading_pairs WHERE symbol = ?', [symbol]);
    res.json({ success: true, message: `${symbol} deleted` });
  } catch (err) {
    logger.error('Admin delete trading pair error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete trading pair' });
  }
};

exports.previewPrice = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const [pair] = await query('SELECT * FROM trading_pairs WHERE symbol = ?', [symbol]);
    if (!pair) return res.status(404).json({ success: false, message: 'Trading pair not found' });

    const ticker   = await cmc.getTicker(symbol);
    const cmcPrice = parseFloat(ticker.price);

    res.json({
      success: true,
      data: {
        symbol,
        cmc_price:    cmcPrice,
        manual_price: pair.manual_price,
        active_price: pair.manual_price ? parseFloat(pair.manual_price) : cmcPrice,
        buy_price:    (cmcPrice * (1 + parseFloat(pair.spread_buy))).toFixed(8),
        sell_price:   (cmcPrice * (1 - parseFloat(pair.spread_sell))).toFixed(8),
        source:       pair.manual_price ? 'manual' : 'coinmarketcap',
      },
    });
  } catch (err) {
    res.status(502).json({ success: false, message: 'Failed to fetch price' });
  }
};
