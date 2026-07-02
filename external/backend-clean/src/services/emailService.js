const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  tls: { rejectUnauthorized: true },
});

const send = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error('Email send failed:', err);
    throw err;
  }
};

const emailTemplates = {
  verifyEmail: (name, url) => ({
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#f9f9f9">
        <div style="background:#1a1a2e;padding:20px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0">Trading Platform</h1>
        </div>
        <div style="background:#fff;padding:30px;border-radius:0 0 8px 8px">
          <h2>Hello ${name},</h2>
          <p>Please verify your email address to activate your account.</p>
          <div style="text-align:center;margin:30px 0">
            <a href="${url}" style="background:#2563eb;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:bold">Verify Email</a>
          </div>
          <p style="color:#666;font-size:14px">This link expires in <strong>24 hours</strong>. If you did not create an account, ignore this email.</p>
          <p style="color:#999;font-size:12px;margin-top:20px">URL: ${url}</p>
        </div>
      </div>`,
  }),

  passwordReset: (name, url) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#f9f9f9">
        <div style="background:#1a1a2e;padding:20px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0">Trading Platform</h1>
        </div>
        <div style="background:#fff;padding:30px;border-radius:0 0 8px 8px">
          <h2>Hello ${name},</h2>
          <p>We received a request to reset your password.</p>
          <div style="text-align:center;margin:30px 0">
            <a href="${url}" style="background:#dc2626;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:bold">Reset Password</a>
          </div>
          <p style="color:#666;font-size:14px">This link expires in <strong>1 hour</strong>. If you did not request this, your account is safe — ignore this email.</p>
        </div>
      </div>`,
  }),

  depositConfirmed: (name, coin, amount, txHash) => ({
    subject: `Deposit Confirmed — ${amount} ${coin}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#f9f9f9">
        <div style="background:#1a1a2e;padding:20px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0">Trading Platform</h1>
        </div>
        <div style="background:#fff;padding:30px;border-radius:0 0 8px 8px">
          <h2 style="color:#16a34a">✅ Deposit Confirmed</h2>
          <p>Hello ${name}, your deposit has been confirmed and credited to your wallet.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">Coin</td><td style="padding:10px;border-bottom:1px solid #eee;font-weight:bold">${coin}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">Amount</td><td style="padding:10px;border-bottom:1px solid #eee;font-weight:bold">${amount} ${coin}</td></tr>
            <tr><td style="padding:10px;color:#666">TX Hash</td><td style="padding:10px;word-break:break-all;font-size:12px">${txHash}</td></tr>
          </table>
        </div>
      </div>`,
  }),

  withdrawalProcessed: (name, coin, amount, status) => ({
    subject: `Withdrawal ${status} — ${amount} ${coin}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#f9f9f9">
        <div style="background:#1a1a2e;padding:20px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0">Trading Platform</h1>
        </div>
        <div style="background:#fff;padding:30px;border-radius:0 0 8px 8px">
          <h2>Withdrawal ${status}</h2>
          <p>Hello ${name}, your withdrawal of <strong>${amount} ${coin}</strong> is now <strong>${status}</strong>.</p>
        </div>
      </div>`,
  }),
};

module.exports = { send, emailTemplates };
