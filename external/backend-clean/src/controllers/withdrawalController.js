const { v4: uuidv4 }         = require('uuid');
const { query, transaction } = require('../config/database');
const nowpayments            = require('../services/nowpaymentsService');
const walletService          = require('../services/walletService');
const cmc                    = require('../services/cmcService');
const logger                 = require('../config/logger');

const getPairInfo = async (coin) => {
  const [pair] = await query(
    "SELECT * FROM trading_pairs WHERE base_coin = ? AND is_active = 1",
    [coin.toUpperCase()]
  );
  return pair || null;
};

const toNOWPaymentsCurrency = (coin, network) => {
  const c = coin.toUpperCase();
  const n = network.toLowerCase();
  const map = {
    'USDT:trx': 'usdttrc20', 'USDT:trc20': 'usdttrc20',
    'USDT:eth': 'usdterc20', 'USDT:erc20': 'usdterc20',
    'USDT:bsc': 'usdtbsc',   'USDT:bep20': 'usdtbsc',
    'BNB:bsc':  'bnbbsc',    'BNB:bep20':  'bnbbsc',
    'WIN:trx':  'win',       'ONE:one':    'one',
  };
  return map[`${c}:${n}`] || c.toLowerCase();
};

exports.requestWithdrawal = async (req, res) => {
  try {
    const { coin, network, address, amount, memo } = req.body;
    const userId  = req.user.id;
    const coinUp  = coin.toUpperCase();
    const netLow  = (network || '').toLowerCase();

    const pair = await getPairInfo(coinUp);
    if (!pair) {
      return res.status(400).json({ success: false, message: `Coin ${coinUp} not supported` });
    }

    const networks  = pair.networks ? JSON.parse(pair.networks) : [];
    const validNet  = networks.find((n) => n.id.toLowerCase() === netLow);
    if (!validNet) {
      return res.status(400).json({
        success: false,
        message: `Network ${netLow} not supported for ${coinUp}`,
        supported: networks.map((n) => n.id),
      });
    }

    const withdrawFee = parseFloat(pair.withdraw_fee) || 0;

    if (!(parseFloat(amount) > 0)) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }

    const netAmount = parseFloat(amount) - withdrawFee;
    if (netAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount too small to cover withdrawal fee' });
    }

    let priceUsdt = 1;
    if (coinUp !== 'USDT') {
      try {
        const ticker = await cmc.getTicker(`${coinUp}-USDT`);
        priceUsdt    = parseFloat(ticker.price);
      } catch {
        return res.status(503).json({ success: false, message: 'Could not get market price, try again' });
      }
    }

    const usdtAmount = parseFloat(amount) * priceUsdt;
    const bal        = await walletService.getBalance(userId);

    if (bal.available < usdtAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        data: { required_usdt: usdtAmount.toFixed(2), available_usdt: bal.available.toFixed(2) },
      });
    }

    const withdrawalId   = uuidv4();
    const npCurrency     = toNOWPaymentsCurrency(coinUp, validNet.id);
    const ipnCallbackUrl = `${process.env.APP_URL}/api/withdraw/ipn`;

    await transaction(async (conn) => {
      await walletService.lockFunds(conn, userId, usdtAmount);
      await conn.execute(
        `INSERT INTO withdrawals
           (id, user_id, coin, network, to_address, memo, amount, fee, net_amount, usdt_value, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [withdrawalId, userId, coinUp, validNet.id, address, memo || null, amount, withdrawFee, netAmount, usdtAmount]
      );
    });

    try {
      const payout = await nowpayments.createPayout({
        address,
        currency: npCurrency,
        amount:   netAmount,
        ipnCallbackUrl,
      });
      const nowId = payout?.withdrawals?.[0]?.id || null;
      await query(
        `UPDATE withdrawals SET status = 'processing', kucoin_wd_id = ?, updated_at = NOW() WHERE id = ?`,
        [nowId, withdrawalId]
      );
      logger.info(`[withdraw] NOWPayments payout: ${withdrawalId} → nowId=${nowId}`);
    } catch (payoutErr) {
      logger.error(`[withdraw] NOWPayments payout failed: ${payoutErr.message}`);
      await transaction(async (conn) => {
        await walletService.unlockFunds(conn, userId, usdtAmount);
        await conn.execute(
          `UPDATE withdrawals SET status = 'failed', error_msg = ?, updated_at = NOW() WHERE id = ?`,
          [payoutErr.message, withdrawalId]
        );
      });
      return res.status(502).json({ success: false, message: `Withdrawal failed: ${payoutErr.message}` });
    }

    res.status(201).json({
      success: true,
      message: 'Withdrawal submitted successfully',
      data: {
        withdrawal_id: withdrawalId,
        coin:          coinUp,
        amount,
        fee:           withdrawFee,
        net_amount:    netAmount,
        address,
        status:        'processing',
      },
    });
  } catch (err) {
    logger.error('[withdraw] requestWithdrawal error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.withdrawalIPN = async (req, res) => {
  try {
    const sig = req.headers['x-nowpayments-sig'];
    const raw = JSON.stringify(req.body);

    if (!nowpayments.verifyWebhook(raw, sig)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const { id, status } = req.body;
    if (!id) return res.status(400).json({ success: false });

    const statusMap = {
      finished:  'completed',
      failed:    'failed',
      expired:   'failed',
      rejected:  'failed',
      refunded:  'failed',
      sending:   'processing',
      confirming:'processing',
    };

    const newStatus = statusMap[status];
    if (newStatus) {
      const [wd] = await query('SELECT * FROM withdrawals WHERE kucoin_wd_id = ?', [String(id)]);

      if (wd && wd.status !== newStatus) {
        await transaction(async (conn) => {
          await conn.execute(
            'UPDATE withdrawals SET status = ?, updated_at = NOW() WHERE id = ?',
            [newStatus, wd.id]
          );

          const lockedUsdt = parseFloat(wd.usdt_value || 0);

          if (newStatus === 'completed') {
            await walletService.unlockAndDebit(conn, wd.user_id, lockedUsdt);
            logger.info(`[withdraw] ✅ ${wd.id} completed — debited ${lockedUsdt} USDT`);
          } else if (newStatus === 'failed') {
            await walletService.unlockFunds(conn, wd.user_id, lockedUsdt);
            logger.info(`[withdraw] ↩ ${wd.id} failed — unlocked ${lockedUsdt} USDT back to available`);
          }
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    logger.error('[withdraw] IPN error:', err.message);
    res.status(500).json({ success: false });
  }
};

exports.getWithdrawalHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, coin } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql      = 'SELECT * FROM withdrawals WHERE user_id = ?';
    const params = [req.user.id];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (coin)   { sql += ' AND coin = ?';   params.push(coin.toUpperCase()); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const withdrawals = await query(sql, params);
    res.json({ success: true, data: withdrawals });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get withdrawal history' });
  }
};

exports.getWithdrawal = async (req, res) => {
  try {
    const [w] = await query(
      'SELECT * FROM withdrawals WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!w) return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    res.json({ success: true, data: w });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get withdrawal' });
  }
};

exports.getWithdrawalFees = async (req, res) => {
  try {
    const pairs = await query(
      "SELECT base_coin, display_name, min_withdraw, withdraw_fee, networks FROM trading_pairs WHERE is_active = 1 ORDER BY sort_order ASC"
    );

    const fees = pairs.map((p) => ({
      coin:         p.base_coin,
      name:         p.display_name,
      min_withdraw: p.min_withdraw,
      fee:          p.withdraw_fee,
      networks:     p.networks ? JSON.parse(p.networks) : [],
    }));

    res.json({ success: true, data: fees });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get withdrawal fees' });
  }
};
