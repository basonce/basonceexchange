const cron                   = require('node-cron');
const { v4: uuidv4 }         = require('uuid');
const { query, transaction } = require('../config/database');
const nowpayments            = require('./nowpaymentsService');
const kucoin                 = require('./kucoinService');
const walletService          = require('./walletService');
const { send, emailTemplates } = require('./emailService');
const logger                 = require('../config/logger');

const normalizeCoin = (npCurrency) => {
  const map = {
    usdttrc20: 'USDT', usdterc20: 'USDT', usdtbsc: 'USDT',
    bnbbsc:    'BNB',  win:       'WIN',   trx:     'TRX',
    eth:       'ETH',  btc:       'BTC',   xrp:     'XRP',
    ada:       'ADA',  sol:       'SOL',   doge:    'DOGE',
    ltc:       'LTC',  atom:      'ATOM',  algo:    'ALGO',
    one:       'ONE',
  };
  const lower = (npCurrency || '').toLowerCase();
  return map[lower] || lower.toUpperCase();
};

const monitorDeposits = async () => {
  try {
    const result   = await nowpayments.getPayments({ limit: 200, page: 0 });
    const payments = result?.data || [];

    const acceptedStatuses = ['finished', 'partially_paid', 'confirmed'];

    for (const pmt of payments) {
      if (!acceptedStatuses.includes(pmt.payment_status)) continue;

      const amount = parseFloat(pmt.actually_paid || 0);
      if (!amount || amount <= 0)
        continue;

      const [existing] = await query(
        'SELECT id FROM deposits WHERE tx_hash = ?',
        [String(pmt.payment_id)]
      );
      if (existing) continue;

      const payAddress = pmt.pay_address;
      if (!payAddress) continue;

      const [addrRow] = await query(
        'SELECT * FROM deposit_addresses WHERE address = ? AND is_active = 1',
        [payAddress]
      );
      if (!addrRow) continue;

      const coinClean = normalizeCoin(pmt.pay_currency || addrRow.coin);

      let usdtAmount = parseFloat(pmt.actually_paid_at_fiat || 0);
      if (!usdtAmount) {
        try {
          const price = await nowpayments.getEstimatedPrice(1, (pmt.pay_currency || 'usd').toLowerCase(), 'usd');
          usdtAmount  = amount * price;
        } catch {
          usdtAmount = amount;
        }
      }

      const depositId = uuidv4();

      await transaction(async (conn) => {
        await conn.execute(
          `INSERT INTO deposits
             (id, user_id, coin, network, amount, usdt_amount, tx_hash,
              to_address, confirmations, required_confirmations, status, credited_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 999, 1, 'completed', NOW())`,
          [
            depositId, addrRow.user_id, coinClean, addrRow.network,
            amount, usdtAmount.toFixed(8),
            String(pmt.payment_id), payAddress,
          ]
        );

        await walletService.creditBalance(
          conn, addrRow.user_id, usdtAmount,
          'deposit', 'deposit', depositId,
          `Deposit ${amount} ${coinClean} (≈${usdtAmount.toFixed(2)} USDT) [poll]`
        );
      });

      try {
        const [user] = await query('SELECT email, full_name FROM users WHERE id = ?', [addrRow.user_id]);
        if (user) {
          const { subject, html } = emailTemplates.depositConfirmed(
            user.full_name, coinClean, amount, String(pmt.payment_id)
          );
          await send({ to: user.email, subject, html });
        }
      } catch {}

      logger.info(`[monitor] ✅ Deposit credited (poll): ${amount} ${coinClean} → user=${addrRow.user_id} (≈${usdtAmount.toFixed(2)} USDT) [status=${pmt.payment_status}]`);
    }
  } catch (err) {
    logger.error('[monitor] monitorDeposits error:', err.message);
  }
};

const syncTrades = async () => {
  try {
    const openTrades = await query(
      "SELECT * FROM trades WHERE status IN ('pending','open','partially_filled') AND kucoin_order_id IS NOT NULL LIMIT 50"
    );
    for (const trade of openTrades) {
      try {
        const kcOrder   = await kucoin.getOrder(trade.kucoin_order_id);
        if (!kcOrder) continue;
        const newStatus = kcOrder.isActive
          ? (parseFloat(kcOrder.dealSize) > 0 ? 'partially_filled' : 'open')
          : (kcOrder.cancelExist ? 'cancelled' : 'filled');

        if (newStatus !== trade.status) {
          await query(
            'UPDATE trades SET status=?,kucoin_status=?,executed_price=?,executed_amount=?,updated_at=NOW() WHERE id=?',
            [newStatus, kcOrder.status, kcOrder.price, kcOrder.dealFunds || 0, trade.id]
          );
          if (newStatus === 'filled' && trade.side === 'sell') {
            const proceeds = parseFloat(kcOrder.dealFunds || 0);
            const fee      = parseFloat(trade.fee_usdt);
            const net      = proceeds - fee;
            if (net > 0) {
              await transaction(async (conn) => {
                await conn.execute(
                  'UPDATE wallets SET locked=GREATEST(0,locked-?) WHERE user_id=?',
                  [parseFloat(trade.total_usdt).toFixed(8), trade.user_id]
                );
                await walletService.creditBalance(conn, trade.user_id, net, 'trade_sell', 'trade', trade.id, `Sell ${trade.amount} ${trade.symbol}`);
                await conn.execute(
                  'INSERT INTO fees_collected (id,trade_id,user_id,amount) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE amount=VALUES(amount)',
                  [uuidv4(), trade.id, trade.user_id, fee]
                );
              });
            }
          }
        }
      } catch (err) {
        logger.error(`[monitor] Trade ${trade.id}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error('[monitor] syncTrades error:', err);
  }
};

const syncWithdrawals = async () => {
  try {
    const processing = await query(
      "SELECT * FROM withdrawals WHERE status='processing' AND kucoin_wd_id IS NOT NULL LIMIT 20"
    );
    for (const wd of processing) {
      logger.info(`[monitor] Withdrawal ${wd.id} still processing (nowId=${wd.kucoin_wd_id})`);
    }
  } catch (err) {
    logger.error('[monitor] syncWithdrawals error:', err);
  }
};

const startMonitors = () => {
  cron.schedule('*/2 * * * *',  monitorDeposits);
  cron.schedule('*/5 * * * *',  syncTrades);
  cron.schedule('*/10 * * * *', syncWithdrawals);
  logger.info('Background monitors started (NOWPayments IPN + polling backup)');
};

module.exports = { startMonitors, monitorDeposits, syncTrades, syncWithdrawals };
