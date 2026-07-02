require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { pool, query } = require('../src/config/database');
const { hashPassword } = require('../src/utils/security');

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@yourdomain.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Super Admin';

async function createAdmin() {
  try {
    const existing = await query('SELECT id FROM users WHERE email = ?', [ADMIN_EMAIL]);
    if (existing.length) {
      console.log('⚠️  Admin already exists:', ADMIN_EMAIL);
      process.exit(0);
    }

    const id = uuidv4();
    const hash = await hashPassword(ADMIN_PASSWORD);

    await query(
      'INSERT INTO users (id, email, password_hash, full_name, is_verified, is_admin) VALUES (?, ?, ?, ?, 1, 1)',
      [id, ADMIN_EMAIL, hash, ADMIN_NAME]
    );
    await query('INSERT INTO wallets (id, user_id) VALUES (?, ?)', [uuidv4(), id]);

    console.log('✅ Admin created successfully');
    console.log('   Email   :', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('⚠️  Change the password immediately after first login!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  }
}

createAdmin();
