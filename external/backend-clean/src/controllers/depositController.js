const { v4: uuidv4 }  = require('uuid');
const { query }       = require('../config/database');
const nowpayments     = require('../services/nowpaymentsService');
const logger          = require('../config/logger');

const getPairInfo = async (coin) => {
  const [pair] = await query(
    "SELECT * FROM trading_pairs WHERE base_coin = ? AND is_active = 1",
    [coin.toUpperCase()]
  );
  return pair || null;
};

const getAllActivePairs = async () => {
  return query("SELECT * FROM trading_pairs WHERE is_active = 1 ORDER BY sort_order ASC");
};

const toNOWPaymentsCurrency = (coin, network) => {
  const c = coin.toUpperCase();
  const n = network.toLowerCase();
  const map = {
    'USDT:trx':   'usdttrc20', 'USDT:trc20': 'usdttrc20',
    'USDT:eth':   'usdterc20', 'USDT:erc20': 'usdterc20',
    'USDT:bsc':   'usdtbsc',   'USDT:bep20': 'usdtbsc',
    'BNB:bsc':    'bnbbsc',    'BNB:bep20':  'bnbbsc',
    'WIN:trx':    'win',
    'ONE:one':    'one',
    'BTC:btc':    'btc',
    'ETH:eth':    'eth',
    'XRP:xrp':    'xrp',
    'ADA:ada':    'ada',
    'SOL:sol':    'sol',
    'DOGE:doge':  'doge',
    'TRX:trx':    'trx',
    'LTC:ltc':    'ltc',
    'ATOM:atom':  'atom',
    'ALGO:algo':  'algo',
    'ZEC:zec':    'zec',
    'DASH:dash':  'dash',
  };
  return map[`${c}:${n}`] || c.toLowerCase();
};

exports.getSupportedPeers = async (req, res) => {
  try {
    const pairs = await getAllActivePairs();

    const peers = pairs.map((p) => ({
      coin:         p.base_coin,
      symbol:       p.symbol,
      name:         p.display_name,
      has_memo:     !!p.has_memo,
      min_deposit:  p.min_deposit,
      min_withdraw: p.min_withdraw,
      withdraw_fee: p.withdraw_fee,
      networks:     p.networks ? JSON.parse(p.networks) : [],
    }));

    res.json({ success: true, data: peers });
  } catch (err) {
    logger.error('getSupportedPeers error:', err);
    res.status(500).json({ success: false, message: 'Failed to get peers' });
  }
};

exports.getDepositAddress = async (req, res) => {
  try {
    const coin = req.params.coin.toUpperCase();
    const pair = await getPairInfo(coin);

    if (!pair) {
      return res.status(400).json({ success: false, message: `Coin ${coin} not supported` });
    }

    const networks = pair.networks ? JSON.parse(pair.networks) : [];
    if (!networks.length) {
      return res.status(400).json({ success: false, message: `No networks configured for ${coin}` });
    }

    const networkParam = (req.query.network || '').toLowerCase();
    const selectedNet  = networkParam
      ? networks.find((n) => n.id.toLowerCase() === networkParam)
      : networks[0];

    if (!selectedNet) {
      return res.status(400).json({
        success: false,
        message: `Network ${networkParam} not supported for ${coin}`,
        supported: networks.map((n) => n.id),
      });
    }

    const [existing] = await query(
      'SELECT address, memo FROM deposit_addresses WHERE user_id = ? AND coin = ? AND network = ? AND is_active = 1',
      [req.user.id, coin, selectedNet.id]
    );
    if (existing) {
      return res.json({
        success: true,
        data: {
          coin,
          network:       selectedNet.id,
          network_label: selectedNet.label,
          address:       existing.address,
          memo:          existing.memo || null,
          has_memo:      !!pair.has_memo,
          min_deposit:   pair.min_deposit,
        },
      });
    }

    const npCurrency = toNOWPaymentsCurrency(coin, selectedNet.id);
    logger.info(`[deposit] Creating NOWPayments address: ${coin}/${selectedNet.id} → ${npCurrency}`);

    let address = null;
    let memo    = null;

    try {
      const result = await nowpayments.createDepositAddress(npCurrency);
      address = result.address;
      memo    = result.extraId || null;
    } catch (npErr) {
      logger.error(`[deposit] NOWPayments error for ${coin}/${selectedNet.id}: ${npErr.message}`);
      return res.status(503).json({
        success: false,
        message: `Could not generate deposit address for ${coin}. Please try again later.`,
        detail:  npErr.message,
      });
    }

    if (!address) {
      return res.status(503).json({
        success: false,
        message: `NOWPayments returned no address for ${coin} (${npCurrency}).`,
      });
    }

    await query(
      `INSERT INTO deposit_addresses (id, user_id, coin, network, address, memo)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE address = VALUES(address), memo = VALUES(memo)`,
      [uuidv4(), req.user.id, coin, selectedNet.id, address, memo]
    );

    logger.info(`[deposit] New address user=${req.user.id} ${coin}/${selectedNet.id} → ${address}`);

    res.json({
      success: true,
      data: {
        coin,
        network:       selectedNet.id,
        network_label: selectedNet.label,
        address,
        memo,
        has_memo:      !!pair.has_memo || !!memo,
        min_deposit:   pair.min_deposit,
        note:          `Send only ${coin} on the ${selectedNet.label} network to this address.`,
      },
    });
  } catch (err) {
    logger.error('[deposit] getDepositAddress error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDepositHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, coin, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql      = 'SELECT * FROM deposits WHERE user_id = ?';
    const params = [req.user.id];
    if (coin)   { sql += ' AND coin = ?';   params.push(coin.toUpperCase()); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [deposits, [{ total }]] = await Promise.all([
      query(sql, params),
      query(
        'SELECT COUNT(*) as total FROM deposits WHERE user_id = ?' +
        (coin   ? ' AND coin = ?'   : '') +
        (status ? ' AND status = ?' : ''),
        [req.user.id, ...(coin ? [coin.toUpperCase()] : []), ...(status ? [status] : [])]
      ),
    ]);

    res.json({
      success: true,
      data: {
        deposits,
        pagination: {
          total, page: parseInt(page), limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    logger.error('Get deposit history error:', err);
    res.status(500).json({ success: false, message: 'Failed to get deposit history' });
  }
};
