const { query } = require('../config/database');
const cmc       = require('../services/cmcService');
const futuresCtrl = require('../controllers/futuresController');
const logger    = require('../config/logger');

const makeCtx = (positionId, userId) => {
  let responseData = null;
  const req = { params: { id: positionId }, user: { id: userId }, body: {} };
  const res = {
    json:   (d) => { responseData = d; },
    status: ()  => ({ json: (d) => { responseData = d; } }),
    data:   ()  => responseData,
  };
  return { req, res };
};

const triggerClose = async (position, reason) => {
  try {
    const { req, res } = makeCtx(position.id, position.user_id);
    await futuresCtrl.closePosition(req, res);
    logger.info(`[futures-trigger] Closed position ${position.id} (${reason}): user=${position.user_id} ${position.symbol}`);
  } catch (err) {
    logger.error(`[futures-trigger] Failed to close ${position.id}: ${err.message}`);
  }
};

const runTriggers = async () => {
  try {
    const openPositions = await query(
      "SELECT * FROM futures_positions WHERE status = 'open'"
    );
    if (!openPositions.length)
      return;

    const symbolMap = {};
    for (const pos of openPositions) {
      if (!symbolMap[pos.symbol]) symbolMap[pos.symbol] = [];
      symbolMap[pos.symbol].push(pos);
    }

    for (const [symbol, positions] of Object.entries(symbolMap)) {
      let markPrice;
      try {
        const ticker = await cmc.getTicker(symbol);
        markPrice = parseFloat(ticker.price);
      } catch (err) {
        logger.warn(`[futures-trigger] Could not get price for ${symbol}: ${err.message}`);
        continue;
      }

      for (const pos of positions) {
        const entryPrice = parseFloat(pos.entry_price);
        const size       = parseFloat(pos.size);
        const unrealizedPnl = pos.side === 'long'
          ? (markPrice - entryPrice) * size
          : (entryPrice - markPrice) * size;

        await query(
          'UPDATE futures_positions SET mark_price = ?, unrealized_pnl = ?, updated_at = NOW() WHERE id = ?',
          [markPrice, unrealizedPnl, pos.id]
        );

        const liqPrice = parseFloat(pos.liquidation_price);
        const isLiquidated = pos.side === 'long'
          ? markPrice <= liqPrice
          : markPrice >= liqPrice;

        if (isLiquidated) {
          logger.warn(`[futures-trigger] LIQUIDATION: pos=${pos.id} mark=${markPrice} liq=${liqPrice}`);
          await query(
            "UPDATE futures_positions SET status = 'liquidated', updated_at = NOW() WHERE id = ? AND status = 'open'",
            [pos.id]
          );
          await query(
            `UPDATE futures_positions
             SET closed_price = ?, closed_at = NOW(), realized_pnl = ?, status = 'liquidated'
             WHERE id = ?`,
            [markPrice, -parseFloat(pos.margin_usdt), pos.id]
          );
          continue;
        }

        if (pos.take_profit) {
          const tp = parseFloat(pos.take_profit);
          const tpHit = pos.side === 'long' ? markPrice >= tp : markPrice <= tp;
          if (tpHit) {
            await triggerClose(pos, `TP@${tp}`);
            continue;
          }
        }

        if (pos.stop_loss) {
          const sl = parseFloat(pos.stop_loss);
          const slHit = pos.side === 'long' ? markPrice <= sl : markPrice >= sl;
          if (slHit) {
            await triggerClose(pos, `SL@${sl}`);
          }
        }
      }
    }
  } catch (err) {
    logger.error('[futures-trigger] runTriggers error:', err.message);
  }
};

const start = () => {
  logger.info('[futures-trigger] Price trigger job started (interval: 10s)');
  setInterval(runTriggers, 10_000);
  runTriggers();
};

module.exports = { start };
