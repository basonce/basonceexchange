const axios  = require('axios');
const crypto = require('crypto');
const logger = require('../config/logger');

const BASE = 'https://api.nowpayments.io/v1';

const headers = () => ({
  'x-api-key':     process.env.NOWPAYMENTS_API_KEY,
  'Content-Type':  'application/json',
});

const npRequest = async (method, path, data = null) => {
  try {
    const res = await axios({
      method,
      url:     `${BASE}${path}`,
      headers: headers(),
      data:    data || undefined,
      timeout: 15000,
    });
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.error || err.message;
    logger.error(`[nowpayments] ${method} ${path}: ${JSON.stringify(err.response?.data || msg)}`);
    throw new Error(msg);
  }
};

const getCurrencies = async () => {
  return npRequest('GET', '/currencies');
};

const getMinimumPaymentAmount = async (currency, fiatCurrency = 'usd') => {
  try {
    const data = await npRequest('GET', `/min-amount?currency_from=${currency.toLowerCase()}&fiat_equivalent=${fiatCurrency}`);
    return {
      min_amount: parseFloat(data.min_amount || 0),
      currency: data.currency_from || currency,
      fiat_equivalent: parseFloat(data.fiat_equivalent || 0),
    };
  } catch (err) {
    logger.warn(`[nowpayments] getMinimumPaymentAmount failed for ${currency}: ${err.message}`);
    return { min_amount: 0, currency, fiat_equivalent: 0 };
  }
};

const createDepositAddress = async (currency) => {
  const cur = currency.toLowerCase();

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      logger.info(`[nowpayments] createDepositAddress attempt ${attempt}: currency=${cur}`);

      const minData = await getMinimumPaymentAmount(cur);
      const refAmount = Math.max(minData.min_amount * 2, 0.001);

      const data = await npRequest('POST', '/payment', {
        price_amount:        refAmount,
        price_currency: cur,
        pay_currency: cur,
        is_fixed_rate:       false,
        is_fee_paid_by_user: false,
        ipn_callback_url:    `${process.env.APP_URL}/api/nowpayments/ipn`,
      });

      if (data?.pay_address) {
        logger.info(`[nowpayments] Got address on attempt ${attempt}: ${data.pay_address} (paymentId=${data.payment_id})`);
        return {
          address:   data.pay_address,
          paymentId: data.payment_id,
          extraId:   data.payin_extra_id || null,
          minAmount: minData.min_amount,
        };
      }

      logger.warn(`[nowpayments] pay_address is null on attempt ${attempt}, status=${data?.payment_status}`);
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1500));

    } catch (err) {
      logger.error(`[nowpayments] attempt ${attempt} failed: ${err.message}`);
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, attempt * 1500));
    }
  }

  throw new Error(`NOWPayments: could not obtain deposit address for ${cur} after 3 attempts`);
};

const getPaymentStatus = async (paymentId) => {
  return npRequest('GET', `/payment/${paymentId}`);
};

const getPayments = async ({ limit = 100, page = 0, dateFrom } = {}) => {
  let url = `/payment/?limit=${limit}&page=${page}&sortBy=created_at&orderBy=desc`;
  if (dateFrom) url += `&dateFrom=${dateFrom}`;
  return npRequest('GET', url);
};

const createPayout = async ({ address, currency, amount, ipnCallbackUrl }) => {
  const data = await npRequest('POST', '/payout', {
    ipn_callback_url: ipnCallbackUrl || `${process.env.APP_URL}/api/nowpayments/ipn`,
    withdrawals: [{
      address,
      currency:  currency.toLowerCase(),
      amount:    String(amount),
    }],
  });
  return data;
};

const verifyWebhook = (rawBody, receivedSig) => {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret)
    return true;

  const sorted     = JSON.parse(rawBody);
  const sortedStr  = JSON.stringify(sortObject(sorted));
  const hmac       = crypto.createHmac('sha512', secret).update(sortedStr).digest('hex');
  return hmac === receivedSig;
};

const sortObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObject);
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = sortObject(obj[key]);
    return acc;
  }, {});
};

const getEstimatedPrice = async (amount, fromCurrency, toCurrency = 'usd') => {
  const data = await npRequest('GET', `/estimate?amount=${amount}&currency_from=${fromCurrency}&currency_to=${toCurrency}`);
  return parseFloat(data.estimated_amount);
};

module.exports = {
  getCurrencies,
  createDepositAddress,
  getMinimumPaymentAmount,
  getPaymentStatus,
  getPayments,
  createPayout,
  verifyWebhook,
  getEstimatedPrice,
};
