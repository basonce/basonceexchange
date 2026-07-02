const express = require('express');
const router  = express.Router();

const authCtrl         = require('../controllers/authController');
const depositCtrl      = require('../controllers/depositController');
const tradeCtrl        = require('../controllers/tradeController');
const withdrawCtrl     = require('../controllers/withdrawalController');
const walletCtrl       = require('../controllers/walletController');
const adminCtrl        = require('../controllers/adminController');
const adminPairsCtrl   = require('../controllers/adminTradingPairsController');
const futuresCtrl      = require('../controllers/futuresController');
const marketCtrl       = require('../controllers/marketController');
const matchBetCtrl     = require('../controllers/matchBetController');
const nowpaymentsIpnCtrl = require('../controllers/nowpaymentsIpnController');

const { authenticate, requireAdmin } = require('../middleware/auth');
const { authLimiter, registerLimiter, tradeLimiter, withdrawLimiter, emailLimiter } = require('../middleware/rateLimiter');
const { validate, rules } = require('../middleware/validators');
const { body } = require('express-validator');

router.get('/market/tickers',            marketCtrl.getAllTickers);
router.get('/market/ticker/:symbol',     marketCtrl.getTicker);
router.get('/market/orderbook/:symbol',  marketCtrl.getOrderBook);
router.get('/market/trades/:symbol',     marketCtrl.getRecentTrades);
router.get('/market/candles/:symbol',    marketCtrl.getCandles);
router.get('/market/symbols',            marketCtrl.getSymbols);

router.post('/auth/register',            registerLimiter, rules.register, validate, authCtrl.register);
router.get('/auth/verify-email',         authCtrl.verifyEmail);
router.post('/auth/resend-verification', emailLimiter, [body('email').isEmail()], validate, authCtrl.resendVerification);
router.post('/auth/login',               authLimiter, rules.login, validate, authCtrl.login);
router.post('/auth/refresh',             authLimiter, rules.refreshToken, validate, authCtrl.refreshToken);
router.post('/auth/logout',              authenticate, authCtrl.logout);
router.post('/auth/forgot-password',     emailLimiter, rules.resetPasswordRequest, validate, authCtrl.forgotPassword);
router.post('/auth/reset-password',      authLimiter, rules.resetPassword, validate, authCtrl.resetPassword);
router.get('/auth/me',                   authenticate, authCtrl.getProfile);

router.get('/wallet/balance',       authenticate, walletCtrl.getBalance);
router.get('/wallet/transactions',  authenticate, walletCtrl.getTransactions);

router.get('/deposit/peers',            authenticate, depositCtrl.getSupportedPeers);
router.get('/deposit/address/:coin',    authenticate, rules.getDepositAddress, validate, depositCtrl.getDepositAddress);
router.get('/deposit/history',          authenticate, depositCtrl.getDepositHistory);

router.post('/trade/order',         authenticate, tradeLimiter, rules.placeTrade, validate, tradeCtrl.placeOrder);
router.get('/trade/orders',         authenticate, tradeCtrl.getOpenOrders);
router.get('/trade/history',        authenticate, tradeCtrl.getTradeHistory);
router.get('/trade/order/:id',      authenticate, tradeCtrl.getOrder);
router.delete('/trade/order/:id',   authenticate, tradeCtrl.cancelOrder);
router.get('/trade/assets',        authenticate, tradeCtrl.getUserAssets);
router.get('/trade/ticker/:symbol', authenticate, tradeCtrl.getTicker);

router.post('/futures/order',           authenticate, tradeLimiter, futuresCtrl.openPosition);
router.post('/futures/close/:id',       authenticate, futuresCtrl.closePosition);
router.patch('/futures/position/:id',   authenticate, futuresCtrl.updateTPSL);
router.get('/futures/positions',        authenticate, futuresCtrl.getOpenPositions);
router.get('/futures/history',          authenticate, futuresCtrl.getPositionHistory);
router.get('/futures/orders',           authenticate, futuresCtrl.getOrderHistory);

router.post('/match-bets',      authenticate, tradeLimiter, matchBetCtrl.placeBet);
router.get('/match-bets/upcoming/:competition', authenticate, matchBetCtrl.getUpcomingMatches);
router.get('/match-bets',       authenticate, matchBetCtrl.getMyBets);
router.get('/match-bets/:id',   authenticate, matchBetCtrl.getBet);

router.post('/nowpayments/ipn',              nowpaymentsIpnCtrl.handleIpn);
router.get('/nowpayments/min-amount/:currency', authenticate, nowpaymentsIpnCtrl.getMinAmount);
router.get('/nowpayments/min-amounts',          authenticate, nowpaymentsIpnCtrl.getMinAmounts);

router.post('/withdraw/request',    authenticate, withdrawLimiter, rules.withdraw, validate, withdrawCtrl.requestWithdrawal);
router.post('/withdraw/ipn',        withdrawCtrl.withdrawalIPN);
router.get('/withdraw/history',     authenticate, withdrawCtrl.getWithdrawalHistory);
router.get('/withdraw/fees',        authenticate, withdrawCtrl.getWithdrawalFees);
router.get('/withdraw/:id',         authenticate, withdrawCtrl.getWithdrawal);

router.get('/admin/stats',                      authenticate, requireAdmin, adminCtrl.getDashboardStats);
router.get('/admin/users',                      authenticate, requireAdmin, adminCtrl.getAllUsers);
router.get('/admin/users/:id',                  authenticate, requireAdmin, adminCtrl.getUserDetail);
router.patch('/admin/users/:id/status',         authenticate, requireAdmin, [body('is_active').isBoolean()], validate, adminCtrl.updateUserStatus);
router.post('/admin/users/:id/credit',          authenticate, requireAdmin, [body('amount').isFloat({ gt: 0 })], validate, adminCtrl.creditUserBalance);
router.get('/admin/deposits',                   authenticate, requireAdmin, adminCtrl.getAllDeposits);
router.get('/admin/withdrawals',                authenticate, requireAdmin, adminCtrl.getAllWithdrawals);
router.post('/admin/withdrawals/:id/reject',    authenticate, requireAdmin, adminCtrl.rejectWithdrawal);
router.get('/admin/fees',                       authenticate, requireAdmin, adminCtrl.getFeesReport);
router.get('/admin/audit-logs',                 authenticate, requireAdmin, adminCtrl.getAuditLogs);

router.get('/admin/trading-pairs',                      authenticate, requireAdmin, adminPairsCtrl.getAll);
router.post('/admin/trading-pairs',                     authenticate, requireAdmin, adminPairsCtrl.create);
router.put('/admin/trading-pairs/:symbol',              authenticate, requireAdmin, adminPairsCtrl.update);
router.delete('/admin/trading-pairs/:symbol',           authenticate, requireAdmin, adminPairsCtrl.remove);
router.get('/admin/trading-pairs/:symbol/price',        authenticate, requireAdmin, adminPairsCtrl.previewPrice);

module.exports = router;
