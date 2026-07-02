const { v4: uuidv4 }           = require('uuid');
const { query, transaction }   = require('../config/database');
const nowpayments              = require('../services/nowpaymentsService');
const walletService            = require('../services/walletService');
const cmc                      = require('../services/cmcService');
const { send, emailTemplates } = require('../services/emailService');
const logger                   = require('../config/logger');

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

const getCoinUsdPrice = async (coin) => {
  if (coin === 'USDT')
    return 1;

  try {
    const ticker = await cmc.getTicker(`${coin}-USDT`);
    const price  = parseFloat(ticker.price);
    if (price > 0) {
      logger.info(`[ipn] Price from CMC: ${coin} = $${price}`);
      return price;
    }
  } catch (e) {
    logger.warn(`[ipn] CMC price failed for ${coin}: ${e.message}`);
  }

  try {
    const price = await nowpayments.getEstimatedPrice(1, coin.toLowerCase(), 'usd');
    const p     = parseFloat(price);
    if (p > 0) {
      logger.info(`[ipn] Price from NOWPayments: ${coin} = $${p}`);
      return p;
    }
  } catch (e) {
    logger.warn(`[ipn] NOWPayments price failed for ${coin}: ${e.message}`);
  }

  logger.error(`[ipn] Could not get price for ${coin} — returning 0`);
  return 0;
};

const handleDepositIpn = async (body) => {
  const {
    payment_id,
    payment_status,
    pay_address,
    pay_currency,
    actually_paid,
    actually_paid_at_fiat,
  } = body;

  const acceptedStatuses = ['finished', 'partially_paid', 'confirmed'];
  if (!acceptedStatuses.includes(payment_status)) {
    logger.info(`[ipn] Deposit ${payment_id} status=${payment_status} — skipping`);
    return;
  }

  const amount = parseFloat(actually_paid || body.pay_amount || 0);
  if (!amount || amount <= 0) {
    logger.warn(`[ipn] Deposit ${payment_id} amount=0 — skipping`);
    return;
  }

  const [existing] = await query(
    'SELECT id FROM deposits WHERE tx_hash = ?',
    [String(payment_id)]
  );
  if (existing) {
    logger.info(`[ipn] Deposit ${payment_id} already processed — skipping`);
    return;
  }

  if (!pay_address) {
    logger.warn(`[ipn] Deposit ${payment_id} has no pay_address`);
    return;
  }

  const [addrRow] = await query(
    'SELECT * FROM deposit_addresses WHERE address = ? AND is_active = 1',
    [pay_address]
  );
  if (!addrRow) {
    logger.warn(`[ipn] No deposit_address found for address=${pay_address}`);
    return;
  }

  const coinClean = normalizeCoin(pay_currency || addrRow.coin);

  let usdtAmount = parseFloat(actually_paid_at_fiat || 0);

  if (!usdtAmount || usdtAmount <= 0) {
    const price = await getCoinUsdPrice(coinClean);
    usdtAmount  = amount * price;
    logger.info(`[ipn] Calculated USDT: ${amount} ${coinClean} × $${price} = $${usdtAmount}`);
  } else {
    logger.info(`[ipn] Using fiat from IPN: $${usdtAmount} for ${amount} ${coinClean}`);
  }

  if (!usdtAmount || usdtAmount <= 0) {
    logger.error(`[ipn] ❌ Cannot credit deposit ${payment_id} — USDT amount is 0 (coin=${coinClean}, amount=${amount})`);
    return;
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
        String(payment_id), pay_address,
      ]
    );

    await walletService.creditBalance(
      conn, addrRow.user_id, usdtAmount,
      'deposit', 'deposit', depositId,
      `Deposit ${amount} ${coinClean} (≈${usdtAmount.toFixed(2)} USDT)`
    );
  });

  try {
    const [user] = await query('SELECT email, full_name FROM users WHERE id = ?', [addrRow.user_id]);
    if (user) {
      const { subject, html } = emailTemplates.depositConfirmed(
        user.full_name, coinClean, amount, String(payment_id)
      );
      await send({ to: user.email, subject, html });
    }
  } catch (e) {
    logger.warn(`[ipn] Email error: ${e.message}`);
  }

  logger.info(`[ipn] ✅ Deposit credited: ${amount} ${coinClean} → user=${addrRow.user_id} (≈${usdtAmount.toFixed(2)} USDT) [status=${payment_status}]`);
};

exports.handleIpn = async (req, res) => {
  try {
    res.status(200).json({ status: 'ok' });

    const body = req.body;
    logger.info('[ipn] Received:', JSON.stringify(body).substring(0, 300));

    if (body.payment_id) {
      await handleDepositIpn(body);
    } else {
      logger.info('[ipn] Non-deposit payload received on deposit IPN endpoint — ignoring');
    }
  } catch (err) {
    logger.error('[ipn] Error:', err);
  }
};

exports.getMinAmount = async (req, res) => {
  try {
    const { currency } = req.params;
    const data = await nowpayments.getMinimumPaymentAmount(currency);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get minimum amount' });
  }
};

exports.getMinAmounts = async (req, res) => {
  try {
    const { currencies } = req.query;
    if (!currencies) {
      return res.status(400).json({ success: false, message: 'currencies param required' });
    }
    const currList = currencies.split(',').map(c => c.trim()).filter(Boolean);
    const results  = await Promise.all(
      currList.map(async (c) => {
        const data = await nowpayments.getMinimumPaymentAmount(c);
        return { currency: c, ...data };
      })
    );
    res.json({ success: true, data: results });
  } catch (err) {
    logger.error('[ipn] getMinAmounts error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
