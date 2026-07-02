const walletService = require('../services/walletService');
const logger = require('../config/logger');

exports.getBalance = async (req, res) => {
  try {
    const balance = await walletService.getBalance(req.user.id);
    res.json({ success: true, data: balance });
  } catch (err) {
    logger.error('Get balance error:', err);
    res.status(500).json({ success: false, message: 'Failed to get balance' });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const result = await walletService.getTransactionHistory(req.user.id, { page, limit, type });
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Get transactions error:', err);
    res.status(500).json({ success: false, message: 'Failed to get transactions' });
  }
};
