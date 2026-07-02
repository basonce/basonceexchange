const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { cache } = require('../config/redis');
const logger = require('../config/logger');

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const ENC_KEY = process.env.ENCRYPTION_KEY;

const hashPassword = async (plain) => bcrypt.hash(plain, ROUNDS);
const comparePassword = async (plain, hash) => bcrypt.compare(plain, hash);

const generateToken = (payload, secret, expiresIn) =>
  jwt.sign(payload, secret, { expiresIn, algorithm: 'HS256' });

const verifyToken = (token, secret) => jwt.verify(token, secret, { algorithms: ['HS256'] });

const generateAccessToken = (user) =>
  generateToken(
    { sub: user.id, email: user.email, role: user.is_admin ? 'admin' : 'user' },
    process.env.JWT_SECRET,
    process.env.JWT_EXPIRES_IN || '15m'
  );

const generateRefreshToken = (userId) =>
  generateToken({ sub: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, process.env.JWT_REFRESH_EXPIRES_IN || '7d');

const generateSecureToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const encrypt = (text) => {
  if (!ENC_KEY || ENC_KEY.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 chars');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENC_KEY), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

const decrypt = (encryptedText) => {
  const [ivHex, encHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENC_KEY), iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
};

const blacklistToken = async (jti, expiresIn) => {
  await cache.set(`bl:${jti}`, 1, expiresIn);
};

const isTokenBlacklisted = async (jti) => {
  return cache.exists(`bl:${jti}`);
};

const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>'"]/g, '');
};

const getClientIp = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.connection.remoteAddress ||
  req.ip;

module.exports = {
  hashPassword, comparePassword,
  generateToken, verifyToken,
  generateAccessToken, generateRefreshToken,
  generateSecureToken, hashToken,
  encrypt, decrypt,
  blacklistToken, isTokenBlacklisted,
  sanitizeInput, getClientIp,
};
