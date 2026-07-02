const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const cmc = require('../services/cmcService');
const walletService = require('../services/walletService');
const logger = require('../config/logger');

const FEE_PERCENT = parseFloat(process.env.FUTURES_FEE_PERCENT) || 0.05;

const getPair = async (symbol) => {
  const [pair] = await query(
    "SELECT * FROM trading_pairs WHERE symbol = ? AND is_active = 1 AND is_futures = 1",
    [symbol.toUpperCase()]
  );
  return pair || null;
};

function calcLiquidationPrice(side, entryPrice, leverage) {
  const maintenanceMarginRate = 0.005;
  if (side === 'long') {
    return entryPrice * (1 - (1 / leverage) + maintenanceMarginRate);
  }
  return entryPrice * (1 + (1 / leverage) - maintenanceMarginRate);
}

function calcUnrealizedPnl(side, entryPrice, markPrice, size) {
  if (side === 'long') {
    return (markPrice - entryPrice) * size;
  }
  return (entryPrice - markPrice) * size;
}

exports.openPosition = async (req, res) => {
  try {
    const { symbol, side, leverage = 10, type = 'market', amount, price } = req.body;
    const userId = req.user.id;

    if (!['long', 'short'].includes(side)) {
      return res.status(400).json({ success: false, message: 'side must be long or short' });
    }

    const pair = await getPair(symbol);
    if (!pair) {
      return res.status(400).json({ success: false, message: `Futures pair ${symbol} not supported or inactive` });
    }

    const maxLev = parseInt(pair.max_leverage) || 100;
    if (leverage < 1 || leverage > maxLev) {
      return res.status(400).json({ success: false, message: `Leverage must be between 1 and ${maxLev}` });
    }
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    let cmcTicker;
    try {
      cmcTicker = await cmc.getTicker(symbol);
    } catch {
      return res.status(503).json({ success: false, message: 'Could not fetch market price. Try again.' });
    }

    const cmcPrice   = parseFloat(cmcTicker.price);
    const entryPrice = type === 'limit' && price ? parseFloat(price) : cmcPrice;

    const size        = parseFloat(amount);
    const notional    = size * entryPrice;
    const marginUsdt  = notional / leverage;
    const feeUsdt     = parseFloat((notional * FEE_PERCENT / 100).toFixed(8));
    const totalDeduct = marginUsdt + feeUsdt;

    if (marginUsdt < parseFloat(pair.min_trade_usdt)) {
      return res.status(400).json({
        success: false,
        message: `Minimum margin is ${pair.min_trade_usdt} USDT`,
      });
    }

    const bal = await walletService.getBalance(userId);
    if (bal.available < totalDeduct) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        data: { required: totalDeduct.toFixed(8), available: bal.available.toFixed(8) },
      });
    }

    const liquidationPrice = calcLiquidationPrice(side, entryPrice, leverage);
    const positionId = uuidv4();
    const orderId    = uuidv4();

    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO futures_positions
          (id, user_id, symbol, side, leverage, entry_price, mark_price, size, margin_usdt,
           notional_usdt, unrealized_pnl, fee_usdt, fee_percent, liquidation_price, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'open')`,
        [positionId, userId, symbol, side, leverage, entryPrice, entryPrice,
         size, marginUsdt, notional, feeUsdt, FEE_PERCENT, liquidationPrice]
      );

      await conn.execute(
        `INSERT INTO futures_orders
          (id, user_id, position_id, symbol, side, order_type, type, leverage, amount,
           price, executed_price, margin_usdt, fee_usdt, status)
         VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, 'filled')`,
        [orderId, userId, positionId, symbol, side, type, leverage,
         size, price || null, entryPrice, marginUsdt, feeUsdt]
      );

      await walletService.debitBalance(
        conn, userId, totalDeduct, 'trade_buy', 'futures', positionId,
        `Open ${side} ${size} ${symbol} x${leverage} @ ${entryPrice}`
      );

      await conn.execute(
        'INSERT INTO fees_collected (id, trade_id, user_id, amount) VALUES (?, ?, ?, ?)',
        [uuidv4(), positionId, userId, feeUsdt]
      );
    });

    res.status(201).json({
      success: true,
      message: 'Position opened',
      data: {
        position_id: positionId,
        order_id:    orderId,
        symbol,
        side,
        leverage,
        size,
        entry_price:       entryPrice,
        cmc_price:         cmcPrice,
        notional_usdt:     notional,
        margin_usdt:       marginUsdt,
        liquidation_price: liquidationPrice,
        fee_usdt:          feeUsdt,
        status:            'open',
      },
    });
  } catch (err) {
    logger.error('Futures open position error:', err);
    res.status(500).json({ success: false, message: 'Failed to open position' });
  }
};

exports.closePosition = async (req, res) => {
  try {
    const userId = req.user.id;
    const [position] = await query(
      "SELECT * FROM futures_positions WHERE id = ? AND user_id = ? AND status = 'open'",
      [req.params.id, userId]
    );
    if (!position) {
      return res.status(404).json({ success: false, message: 'Open position not found' });
    }

    let cmcTicker;
    try {
      cmcTicker = await cmc.getTicker(position.symbol);
    } catch {
      return res.status(503).json({ success: false, message: 'Could not fetch market price' });
    }

    const closePrice  = parseFloat(cmcTicker.price);
    const size        = parseFloat(position.size);
    const entryPrice  = parseFloat(position.entry_price);
    const notional    = size * closePrice;
    const feeUsdt     = parseFloat((notional * FEE_PERCENT / 100).toFixed(8));
    const realizedPnl = calcUnrealizedPnl(position.side, entryPrice, closePrice, size);
    const marginReturn = parseFloat(position.margin_usdt);
    const creditAmount = marginReturn + realizedPnl - feeUsdt;

    const orderId = uuidv4();

    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE futures_positions
         SET status='closed', closed_price=?, closed_at=NOW(), realized_pnl=?,
             unrealized_pnl=0, mark_price=?, fee_usdt=fee_usdt+?, updated_at=NOW()
         WHERE id=?`,
        [closePrice, realizedPnl, closePrice, feeUsdt, position.id]
      );

      await conn.execute(
        `INSERT INTO futures_orders
          (id, user_id, position_id, symbol, side, order_type, type, leverage, amount,
           executed_price, margin_usdt, fee_usdt, realized_pnl, status)
         VALUES (?, ?, ?, ?, ?, 'close', 'market', ?, ?, ?, ?, ?, ?, 'filled')`,
        [orderId, userId, position.id, position.symbol, position.side,
         position.leverage, size, closePrice, marginReturn, feeUsdt, realizedPnl]
      );

      if (creditAmount > 0) {
        await walletService.creditBalance(
          conn, userId, creditAmount, 'trade_sell', 'futures', position.id,
          `Close ${position.side} ${position.symbol} @ ${closePrice} | PnL: ${realizedPnl.toFixed(4)} USDT`
        );
      }

      await conn.execute(
        'INSERT INTO fees_collected (id, trade_id, user_id, amount) VALUES (?, ?, ?, ?)',
        [uuidv4(), position.id, userId, feeUsdt]
      );
    });

    res.json({
      success: true,
      message: 'Position closed',
      data: {
        position_id:   position.id,
        close_price:   closePrice,
        realized_pnl:  realizedPnl,
        fee_usdt:      feeUsdt,
        credit_amount: creditAmount,
      },
    });
  } catch (err) {
    logger.error('Futures close position error:', err);
    res.status(500).json({ success: false, message: 'Failed to close position' });
  }
};

exports.updateTPSL = async (req, res) => {
  try {
    const userId = req.user.id;
    const { take_profit, stop_loss } = req.body;
    const [position] = await query(
      "SELECT * FROM futures_positions WHERE id = ? AND user_id = ? AND status = 'open'",
      [req.params.id, userId]
    );
    if (!position) return res.status(404).json({ success: false, message: 'Open position not found' });

    await query(
      'UPDATE futures_positions SET take_profit=?, stop_loss=?, updated_at=NOW() WHERE id=?',
      [take_profit || null, stop_loss || null, position.id]
    );

    res.json({ success: true, message: 'TP/SL updated', data: { take_profit, stop_loss } });
  } catch (err) {
    logger.error('Futures update TP/SL error:', err);
    res.status(500).json({ success: false, message: 'Failed to update TP/SL' });
  }
};

exports.getOpenPositions = async (req, res) => {
  try {
    const positions = await query(
      "SELECT * FROM futures_positions WHERE user_id = ? AND status = 'open' ORDER BY created_at DESC",
      [req.user.id]
    );

    const enriched = await Promise.all(
      positions.map(async (p) => {
        try {
          const ticker   = await cmc.getTicker(p.symbol);
          const markPrice = parseFloat(ticker.price);
          const unrealizedPnl = calcUnrealizedPnl(
            p.side, parseFloat(p.entry_price), markPrice, parseFloat(p.size)
          );

          const shouldTriggerTP = p.take_profit && (
            (p.side === 'long'  && markPrice >= parseFloat(p.take_profit)) ||
            (p.side === 'short' && markPrice <= parseFloat(p.take_profit))
          );
          const shouldTriggerSL = p.stop_loss && (
            (p.side === 'long'  && markPrice <= parseFloat(p.stop_loss)) ||
            (p.side === 'short' && markPrice >= parseFloat(p.stop_loss))
          );

          return {
            ...p,
            mark_price:      markPrice,
            unrealized_pnl:  unrealizedPnl,
            tp_triggered:    shouldTriggerTP || false,
            sl_triggered:    shouldTriggerSL || false,
          };
        } catch {
          return p;
        }
      })
    );

    res.json({ success: true, data: enriched });
  } catch (err) {
    logger.error('Get futures positions error:', err);
    res.status(500).json({ success: false, message: 'Failed to get positions' });
  }
};

exports.getPositionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [positions, [{ total }]] = await Promise.all([
      query(
        "SELECT * FROM futures_positions WHERE user_id = ? AND status != 'open' ORDER BY closed_at DESC LIMIT ? OFFSET ?",
        [req.user.id, parseInt(limit), offset]
      ),
      query(
        "SELECT COUNT(*) as total FROM futures_positions WHERE user_id = ? AND status != 'open'",
        [req.user.id]
      ),
    ]);

    res.json({
      success: true,
      data: {
        positions,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get position history' });
  }
};

exports.getOrderHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const orders = await query(
      'SELECT * FROM futures_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.user.id, parseInt(limit), offset]
    );
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get order history' });
  }
};
