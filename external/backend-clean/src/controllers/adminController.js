const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const cmc = require('../services/cmcService');
const walletService = require('../services/walletService');
const { send, emailTemplates } = require('../services/emailService');
const logger = require('../config/logger');

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      [{ total_users }],
      [{ active_users }],
      [{ total_deposits }],
      [{ total_withdrawals }],
      [{ total_fees }],
      [{ pending_withdrawals }],
      [{ total_balance }],
    ] = await Promise.all([
      query('SELECT COUNT(*) as total_users FROM users'),
      query('SELECT COUNT(*) as active_users FROM users WHERE is_active = 1 AND is_verified = 1'),
      query("SELECT COALESCE(SUM(usdt_amount),0) as total_deposits FROM deposits WHERE status = 'completed'"),
      query("SELECT COALESCE(SUM(net_amount * 1),0) as total_withdrawals FROM withdrawals WHERE status = 'completed'"),
      query('SELECT COALESCE(SUM(amount),0) as total_fees FROM fees_collected'),
      query("SELECT COUNT(*) as pending_withdrawals FROM withdrawals WHERE status = 'pending'"),
      query('SELECT COALESCE(SUM(balance),0) as total_balance FROM wallets'),
    ]);

    res.json({
      success: true,
      data: {
        users: { total: total_users, active: active_users },
        deposits: { total_usdt: parseFloat(total_deposits) },
        withdrawals: { total_usdt: parseFloat(total_withdrawals), pending_count: pending_withdrawals },
        fees: { total_usdt: parseFloat(total_fees) },
        platform: { total_user_balances: parseFloat(total_balance) },
      },
    });
  } catch (err) {
    logger.error('Admin stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to get stats' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, is_active, is_verified } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `SELECT u.id, u.email, u.full_name, u.is_active, u.is_verified, u.is_admin, u.kyc_status,
               u.last_login_at, u.created_at, w.balance, w.locked
               FROM users u LEFT JOIN wallets w ON u.id = w.user_id WHERE 1=1`;
    const params = [];

    if (search) { sql += ' AND (u.email LIKE ? OR u.full_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (is_active !== undefined) { sql += ' AND u.is_active = ?'; params.push(is_active); }
    if (is_verified !== undefined) { sql += ' AND u.is_verified = ?'; params.push(is_verified); }

    sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [users, [{ total }]] = await Promise.all([
      query(sql, params),
      query('SELECT COUNT(*) as total FROM users WHERE 1=1' + (search ? ' AND (email LIKE ? OR full_name LIKE ?)' : ''), search ? [`%${search}%`, `%${search}%`] : []),
    ]);

    res.json({ success: true, data: { users, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } } });
  } catch (err) {
    logger.error('Admin get users error:', err);
    res.status(500).json({ success: false, message: 'Failed to get users' });
  }
};

exports.getUserDetail = async (req, res) => {
  try {
    const [user] = await query(
      'SELECT u.*, w.balance, w.locked FROM users u LEFT JOIN wallets w ON u.id = w.user_id WHERE u.id = ?',
      [req.params.id]
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    delete user.password_hash;

    const [deposits, trades, withdrawals] = await Promise.all([
      query('SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [req.params.id]),
      query('SELECT * FROM trades WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [req.params.id]),
      query('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [req.params.id]),
    ]);

    res.json({ success: true, data: { user, deposits, trades, withdrawals } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get user' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { is_active } = req.body;
    const [user] = await query('SELECT id FROM users WHERE id = ? AND is_admin = 0', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await query('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, req.params.id]);
    await query('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), req.user.id, is_active ? 'admin_activate_user' : 'admin_suspend_user', 'user', req.params.id, req.ip]);

    res.json({ success: true, message: `User ${is_active ? 'activated' : 'suspended'}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

exports.creditUserBalance = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });

    const [user] = await query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await transaction(async (conn) => {
      await walletService.creditBalance(conn, req.params.id, amount, 'admin_credit', 'admin', req.user.id, reason || 'Admin credit');
    });

    await query('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, meta) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), req.user.id, 'admin_credit_balance', 'user', req.params.id, JSON.stringify({ amount, reason })]);

    res.json({ success: true, message: `Credited ${amount} USDT to user` });
  } catch (err) {
    logger.error('Admin credit error:', err);
    res.status(500).json({ success: false, message: 'Failed to credit balance' });
  }
};

exports.getAllDeposits = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, coin } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `SELECT d.*, u.email, u.full_name FROM deposits d JOIN users u ON d.user_id = u.id WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND d.status = ?'; params.push(status); }
    if (coin) { sql += ' AND d.coin = ?'; params.push(coin.toUpperCase()); }
    sql += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const deposits = await query(sql, params);
    res.json({ success: true, data: deposits });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get deposits' });
  }
};

exports.getAllWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `SELECT w.*, u.email, u.full_name FROM withdrawals w JOIN users u ON w.user_id = u.id WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND w.status = ?'; params.push(status); }
    sql += ' ORDER BY w.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const withdrawals = await query(sql, params);
    res.json({ success: true, data: withdrawals });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get withdrawals' });
  }
};

exports.rejectWithdrawal = async (req, res) => {
  try {
    const { reason } = req.body;
    const [w] = await query('SELECT * FROM withdrawals WHERE id = ? AND status = ?', [req.params.id, 'pending']);
    if (!w) return res.status(404).json({ success: false, message: 'Pending withdrawal not found' });

    let priceUsdt = 1;
    if (w.coin !== 'USDT') {
      try {
        const ticker = await cmc.getTicker(`${w.coin}-USDT`);
        priceUsdt = parseFloat(ticker.price);
      } catch {}
    }
    const usdtAmount = parseFloat(w.amount) * priceUsdt;

    await transaction(async (conn) => {
      await walletService.unlockFunds(conn, w.user_id, usdtAmount);
      await conn.execute(
        'UPDATE withdrawals SET status = ?, admin_approved = 0, admin_id = ?, admin_note = ? WHERE id = ?',
        ['cancelled', req.user.id, reason || 'Rejected by admin', w.id]
      );
    });

    res.json({ success: true, message: 'Withdrawal rejected and funds returned to user' });
  } catch (err) {
    logger.error('Reject withdrawal error:', err);
    res.status(500).json({ success: false, message: 'Failed to reject withdrawal' });
  }
};

exports.getFeesReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    let sql = `SELECT f.*, t.symbol, t.side, u.email FROM fees_collected f
               JOIN trades t ON f.trade_id = t.id JOIN users u ON f.user_id = u.id WHERE 1=1`;
    const params = [];
    if (from) { sql += ' AND f.created_at >= ?'; params.push(from); }
    if (to) { sql += ' AND f.created_at <= ?'; params.push(to); }
    sql += ' ORDER BY f.created_at DESC LIMIT 500';

    const [fees, [{ total }]] = await Promise.all([
      query(sql, params),
      query('SELECT COALESCE(SUM(amount),0) as total FROM fees_collected'),
    ]);

    res.json({ success: true, data: { fees, total_collected: parseFloat(total) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get fees report' });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, user_id, action } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    if (user_id) { sql += ' AND user_id = ?'; params.push(user_id); }
    if (action) { sql += ' AND action = ?'; params.push(action); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const logs = await query(sql, params);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get audit logs' });
  }
};
