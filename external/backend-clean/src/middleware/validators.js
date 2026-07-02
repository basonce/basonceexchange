const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, message: 'Validation failed', errors: errors.array().map(e => ({ field: e.path, msg: e.msg })) });
  }
  next();
};

const rules = {
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).withMessage('Password must be 8+ chars with uppercase, lowercase, number, and special char'),
    body('full_name').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 chars'),
  ],
  login: [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password required'),
  ],
  resetPasswordRequest: [
    body('email').isEmail().normalizeEmail(),
  ],
  resetPassword: [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).withMessage('Strong password required'),
  ],
  refreshToken: [
    body('refresh_token').notEmpty().withMessage('Refresh token required'),
  ],
  getDepositAddress: [
    param('coin').notEmpty().isAlpha().isUppercase().isLength({ max: 10 }),
    query('network').optional().isAlphanumeric().isLength({ max: 20 }),
  ],
  placeTrade: [
    body('symbol').notEmpty().matches(/^[A-Z]+-[A-Z]+$/).withMessage('Invalid symbol format (e.g. BTC-USDT)'),
    body('side').isIn(['buy', 'sell']).withMessage('Side must be buy or sell'),
    body('type').optional().isIn(['market', 'limit']),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be positive'),
    body('price').optional().isFloat({ gt: 0 }),
  ],
  withdraw: [
    body('coin').notEmpty().isAlpha().isUppercase().isLength({ max: 10 }),
    body('network').notEmpty().isAlphanumeric().isLength({ max: 20 }),
    body('address').notEmpty().isLength({ min: 10, max: 255 }).withMessage('Invalid address'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be positive'),
    body('memo').optional().isLength({ max: 100 }),
  ],
};

module.exports = { validate, rules };
