const { verifyToken, isTokenBlacklisted, getClientIp } = require('../utils/security');
const { query } = require('../config/database');
const logger = require('../config/logger');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];
    let payload;

    try {
      payload = verifyToken(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const jti = payload.jti || payload.sub + payload.iat;
    if (await isTokenBlacklisted(jti)) {
      return res.status(401).json({ success: false, message: 'Token revoked' });
    }

    const [user] = await query('SELECT id, email, full_name, is_active, is_admin, is_verified FROM users WHERE id = ?', [payload.sub]);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (!user.is_active) return res.status(403).json({ success: false, message: 'Account suspended' });
    if (!user.is_verified) return res.status(403).json({ success: false, message: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' });

    req.user = user;
    req.token = token;
    req.tokenPayload = payload;
    next();
  } catch (err) {
    logger.error('Auth middleware error:', err);
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = verifyToken(token, process.env.JWT_SECRET);
        const [user] = await query('SELECT id, email, full_name, is_active, is_admin FROM users WHERE id = ?', [payload.sub]);
        if (user && user.is_active) req.user = user;
      } catch {}
    }
    next();
  } catch {
    next();
  }
};

module.exports = { authenticate, requireAdmin, optionalAuth };
