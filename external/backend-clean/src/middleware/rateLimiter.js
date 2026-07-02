const rateLimit = require('express-rate-limit');
const { getClientIp } = require('../utils/security');

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIp(req),
    skip: (req) => req.user?.is_admin === 1,
  });

module.exports = {
  authLimiter:       createLimiter(15 * 60 * 1000, 10,  'Too many auth attempts, try again in 15 minutes'),
  registerLimiter:   createLimiter(60 * 60 * 1000, 5,   'Too many registrations from this IP'),
  tradeLimiter:      createLimiter(60 * 1000,       30,  'Too many trade requests'),
  withdrawLimiter:   createLimiter(60 * 60 * 1000,  5,   'Too many withdrawal requests per hour'),
  generalLimiter:    createLimiter(60 * 1000,        100, 'Too many requests'),
  emailLimiter:      createLimiter(60 * 60 * 1000,  3,   'Too many email requests per hour'),
};
