const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const { hashPassword, comparePassword, generateAccessToken, generateRefreshToken, verifyToken, generateSecureToken, hashToken, blacklistToken, getClientIp } = require('../utils/security');
const { send, emailTemplates } = require('../services/emailService');
const walletService = require('../services/walletService');
const logger = require('../config/logger');

exports.register = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ success: false, message: 'Email already registered' });

    const id = uuidv4();
    const password_hash = await hashPassword(password);

    await transaction(async (conn) => {
      await conn.execute(
        'INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
        [id, email, password_hash, full_name]
      );
      await conn.execute('INSERT INTO wallets (id, user_id) VALUES (?, ?)', [uuidv4(), id]);

      const token = generateSecureToken(48);
      const tokenId = uuidv4();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await conn.execute(
        'INSERT INTO email_verifications (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
        [tokenId, id, token, expires]
      );

      const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
      const { subject, html } = emailTemplates.verifyEmail(full_name, verifyUrl);
      await send({ to: email, subject, html });
    });

    await query('INSERT INTO audit_logs (id, user_id, action, ip_address) VALUES (?, ?, ?, ?)',
      [uuidv4(), id, 'user_registered', getClientIp(req)]);

    res.status(201).json({ success: true, message: 'Registration successful. Please verify your email.' });
  } catch (err) {
    logger.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });

    const [verification] = await query(
      'SELECT * FROM email_verifications WHERE token = ? AND used_at IS NULL AND expires_at > NOW()',
      [token]
    );
    if (!verification) return res.status(400).json({ success: false, message: 'Invalid or expired token' });

    await transaction(async (conn) => {
      await conn.execute('UPDATE users SET is_verified = 1 WHERE id = ?', [verification.user_id]);
      await conn.execute('UPDATE email_verifications SET used_at = NOW() WHERE id = ?', [verification.id]);
    });

    res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    logger.error('Verify email error:', err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const [user] = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.json({ success: true, message: 'If that email exists, a verification link was sent' });
    if (user.is_verified) return res.status(400).json({ success: false, message: 'Email already verified' });

    const token = generateSecureToken(48);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query('INSERT INTO email_verifications (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), user.id, token, expires]);

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const { subject, html } = emailTemplates.verifyEmail(user.full_name, verifyUrl);
    await send({ to: email, subject, html });

    res.json({ success: true, message: 'Verification email sent' });
  } catch (err) {
    logger.error('Resend verification error:', err);
    res.status(500).json({ success: false, message: 'Failed to resend' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = getClientIp(req);

    const [user] = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({ success: false, message: `Account locked. Try again in ${remaining} minutes` });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      const attempts = user.login_attempts + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;
      await query('UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?', [attempts, lockUntil, user.id]);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.is_active) return res.status(403).json({ success: false, message: 'Account suspended' });
    if (!user.is_verified)
      return res.status(403).json({ success: false, message: 'Please verify your email first', code: 'EMAIL_NOT_VERIFIED' });

    await query('UPDATE users SET login_attempts = 0, locked_until = NULL, last_login_at = NOW(), last_login_ip = ? WHERE id = ?', [ip, user.id]);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);
    const refreshHash = hashToken(refreshToken);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), user.id, refreshHash, refreshExpires, ip, req.headers['user-agent']?.substring(0, 500)]
    );

    await query('INSERT INTO audit_logs (id, user_id, action, ip_address) VALUES (?, ?, ?, ?)',
      [uuidv4(), user.id, 'user_login', ip]);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900,
        user: { id: user.id, email: user.email, full_name: user.full_name, is_admin: !!user.is_admin },
      },
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    let payload;

    try {
      payload = verifyToken(refresh_token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    if (payload.type !== 'refresh') return res.status(401).json({ success: false, message: 'Invalid token type' });

    const tokenHash = hashToken(refresh_token);
    const [stored] = await query(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()',
      [tokenHash]
    );
    if (!stored) return res.status(401).json({ success: false, message: 'Refresh token not found or expired' });

    const [user] = await query('SELECT * FROM users WHERE id = ?', [stored.user_id]);
    if (!user || !user.is_active)
      return res.status(401).json({ success: false, message: 'User not found or suspended' });

    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [stored.id]);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user.id);
    const newHash = hashToken(newRefreshToken);
    const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), user.id, newHash, newExpires, getClientIp(req), req.headers['user-agent']?.substring(0, 500)]
    );

    res.json({
      success: true,
      data: { access_token: newAccessToken, refresh_token: newRefreshToken, expires_in: 900 },
    });
  } catch (err) {
    logger.error('Refresh token error:', err);
    res.status(500).json({ success: false, message: 'Token refresh failed' });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    const payload = req.tokenPayload;
    const jti = payload.jti || payload.sub + payload.iat;
    const ttl = payload.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0)
      await blacklistToken(jti, ttl);

    if (refresh_token) {
      const hash = hashToken(refresh_token);
      await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND user_id = ?', [hash, req.user.id]);
    }

    await query('INSERT INTO audit_logs (id, user_id, action, ip_address) VALUES (?, ?, ?, ?)',
      [uuidv4(), req.user.id, 'user_logout', getClientIp(req)]);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    logger.error('Logout error:', err);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const [user] = await query('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);

    const msg = { success: true, message: 'If that email is registered, a reset link was sent' };
    if (!user) return res.json(msg);

    const token = generateSecureToken(48);
    const tokenHash = hashToken(token);
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await query('INSERT INTO password_resets (id, user_id, token_hash, expires_at, ip_address) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), user.id, tokenHash, expires, getClientIp(req)]);

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const { subject, html } = emailTemplates.passwordReset(user.full_name, resetUrl);
    await send({ to: email, subject, html });

    res.json(msg);
  } catch (err) {
    logger.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Request failed' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const tokenHash = hashToken(token);

    const [reset] = await query(
      'SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()',
      [tokenHash]
    );
    if (!reset) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });

    const passwordHash = await hashPassword(password);

    await transaction(async (conn) => {
      await conn.execute('UPDATE users SET password_hash = ?, login_attempts = 0, locked_until = NULL WHERE id = ?',
        [passwordHash, reset.user_id]);
      await conn.execute('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [reset.id]);
      await conn.execute('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [reset.user_id]);
    });

    await query('INSERT INTO audit_logs (id, user_id, action, ip_address) VALUES (?, ?, ?, ?)',
      [uuidv4(), reset.user_id, 'password_reset', getClientIp(req)]);

    res.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    logger.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const [user] = await query(
      'SELECT id, email, full_name, is_verified, is_admin, kyc_status, two_fa_enabled, last_login_at, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    const wallet = await walletService.getBalance(req.user.id);
    res.json({ success: true, data: { user, wallet } });
  } catch (err) {
    logger.error('Get profile error:', err);
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
};
