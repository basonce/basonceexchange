const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const cmc = require('../services/cmcService');
const walletService = require('../services/walletService');
const logger = require('../config/logger');

const FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT) || 1;

const getPair = async (symbol) => {
  const [pair] = await query(
    "SELECT * FROM trading_pairs WHERE symbol = ? AND is_active = 1 AND is_spot = 1",
    [symbol.toUpperCase()]
  );
  return pair || null;
};

const getExecutionPrice = (cmcPrice, side, pair) => {
  const base = pair.manual_price ? parseFloat(pair.manual_price) : parseFloat(cmcPrice);
  if (side === 'buy') {
    return base * (1 + parseFloat(pair.spread_buy));
  } else {
    return base * (1 - parseFloat(pair.spread_sell));
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const { symbol, side, type = 'market', amount, price } = req.body;
    const userId = req.user.id;

    const pair = await getPair(symbol);
    if (!pair) {
      return res.status(400).json({ success: false, message: `Trading pair ${symbol} not supported or inactive` });
    }

    const qty = parseFloat(amount);
    if (!qty || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    let cmcTicker;
    try {
      cmcTicker = await cmc.getTicker(symbol);
    } catch {
      return res.status(503).json({ success: false, message: 'Could not fetch market price. Try again.' });
    }

    const cmcPrice = parseFloat(cmcTicker.price);

    const executionPrice = type === 'limit' && price
      ? parseFloat(price)
      : getExecutionPrice(cmcPrice, side, pair);

    const tradeUsdtValue = qty * executionPrice;

    if (tradeUsdtValue < parseFloat(pair.min_trade_usdt)) {
      return res.status(400).json({
        success: false,
        message: `Minimum trade value is ${pair.min_trade_usdt} USDT`,
      });
    }
    if (parseFloat(pair.max_trade_usdt) > 0 && tradeUsdtValue > parseFloat(pair.max_trade_usdt)) {
      return res.status(400).json({
        success: false,
        message: `Maximum trade value is ${pair.max_trade_usdt} USDT`,
      });
    }

    const feeUsdt     = parseFloat((tradeUsdtValue * FEE_PERCENT / 100).toFixed(8));
    const totalDeduct = tradeUsdtValue + feeUsdt;

    if (side === 'buy') {
      const bal = await walletService.getBalance(userId);
      if (bal.available < totalDeduct) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient USDT balance',
          data: {
            required:  totalDeduct.toFixed(8),
            available: bal.available.toFixed(8),
          },
        });
      }
    }

    if (side === 'sell') {
      const assetBal = await walletService.getAssetBalance(userId, pair.base_coin);
      if (assetBal.available < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ${pair.base_coin} balance`,
          data: {
            required:  qty.toFixed(8),
            available: assetBal.available.toFixed(8),
          },
        });
      }
    }

    const tradeId    = uuidv4();
    const internalId = `ORD-${tradeId.replace(/-/g, '').substring(0, 16).toUpperCase()}`;

    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO trades
          (id, user_id, kucoin_order_id, symbol, side, type, amount, price,
           fee_usdt, fee_percent, total_usdt, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'filled')`,
        [tradeId, userId, internalId, symbol, side, type,
         qty, executionPrice, feeUsdt, FEE_PERCENT, tradeUsdtValue]
      );

      if (side === 'buy') {
        await walletService.debitBalance(
          conn, userId, totalDeduct, 'trade_buy', 'trade', tradeId,
          `Buy ${qty} ${pair.base_coin} @ ${executionPrice.toFixed(4)} USDT`
        );
        await walletService.creditAsset(conn, userId, pair.base_coin, qty);
        await conn.execute(
          'INSERT INTO fees_collected (id, trade_id, user_id, amount) VALUES (?, ?, ?, ?)',
          [uuidv4(), tradeId, userId, feeUsdt]
        );

      } else {
        await walletService.debitAsset(conn, userId, pair.base_coin, qty);
        const netCredit = tradeUsdtValue - feeUsdt;
        await walletService.creditBalance(
          conn, userId, netCredit, 'trade_sell', 'trade', tradeId,
          `Sell ${qty} ${pair.base_coin} @ ${executionPrice.toFixed(4)} USDT`
        );
        await conn.execute(
          'INSERT INTO fees_collected (id, trade_id, user_id, amount) VALUES (?, ?, ?, ?)',
          [uuidv4(), tradeId, userId, feeUsdt]
        );
      }
    });

    res.status(201).json({
      success: true,
      message: 'Order executed successfully',
      data: {
        trade_id:        tradeId,
        internal_ref:    internalId,
        symbol,
        side,
        type,
        amount:          qty,
        cmc_price:       cmcPrice,
        execution_price: executionPrice,
        spread_applied:  side === 'buy' ? pair.spread_buy : pair.spread_sell,
        fee_usdt:        feeUsdt,
        fee_percent:     FEE_PERCENT,
        total_usdt:      tradeUsdtValue,
        status:          'filled',
      },
    });

  } catch (err) {
    logger.error('Place order error:', err);
    if (err.message && (err.message.includes('Insufficient') || err.message.includes('balance'))) {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Failed to place order' });
  }
};

exports.getOpenOrders = async (req, res) => {
  try {
    const { symbol, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = "SELECT * FROM trades WHERE user_id = ? AND status IN ('pending','open','partially_filled')";
    const params = [req.user.id];
    if (symbol) { sql += ' AND symbol = ?'; params.push(symbol.toUpperCase()); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const trades = await query(sql, params);
    res.json({ success: true, data: trades });
  } catch (err) {
    logger.error('Get open orders error:', err);
    res.status(500).json({ success: false, message: 'Failed to get orders' });
  }
};

exports.getTradeHistory = async (req, res) => {
  try {
    const { symbol, side, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = "SELECT * FROM trades WHERE user_id = ? AND status IN ('filled','cancelled','failed')";
    const params = [req.user.id];
    if (symbol) { sql += ' AND symbol = ?'; params.push(symbol.toUpperCase()); }
    if (side)   { sql += ' AND side = ?';   params.push(side); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [trades, [{ total }]] = await Promise.all([
      query(sql, params),
      query("SELECT COUNT(*) as total FROM trades WHERE user_id = ? AND status IN ('filled','cancelled','failed')", [req.user.id]),
    ]);

    res.json({
      success: true,
      data: { trades, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get trade history' });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const [trade] = await query('SELECT * FROM trades WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!trade) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: trade });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get order' });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const [trade] = await query('SELECT * FROM trades WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!trade) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!['open', 'pending', 'partially_filled'].includes(trade.status)) {
      return res.status(400).json({ success: false, message: 'Order cannot be cancelled (already filled)' });
    }

    await query("UPDATE trades SET status = 'cancelled', updated_at = NOW() WHERE id = ?", [trade.id]);

    await transaction(async (conn) => {
      if (trade.side === 'buy') {
        const refundAmount = parseFloat(trade.total_usdt) + parseFloat(trade.fee_usdt);
        await walletService.creditBalance(
          conn, req.user.id, refundAmount, 'refund', 'trade', trade.id,
          `Refund for cancelled buy order ${trade.id}`
        );
      } else {
        const pair = await getPair(trade.symbol);
        if (pair) {
          await walletService.creditAsset(conn, req.user.id, pair.base_coin, parseFloat(trade.amount));
        }
      }
    });

    res.json({ success: true, message: 'Order cancelled and refunded' });
  } catch (err) {
    logger.error('Cancel order error:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
};

exports.getTicker = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const pair   = await getPair(symbol);
    if (!pair) return res.status(400).json({ success: false, message: 'Unsupported symbol' });

    const ticker   = await cmc.getTicker(symbol);
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
    res.status(502).json({ success: false, message: 'Failed to get ticker' });
  }
};

exports.getUserAssets = async (req, res) => {
  try {
    const assets = await walletService.getAllAssets(req.user.id);
    res.json({ success: true, data: assets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get assets' });
  }
};
