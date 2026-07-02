require('dotenv').config();
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs');

const logger = require('./config/logger');
const { generalLimiter } = require('./middleware/rateLimiter');
const routes = require('./routes/index');
const { startMonitors } = require('./services/txMonitor');
const { setupWebSocket } = require('./services/wsServer');
const priceTrigger = require('./jobs/futuresPriceTrigger');
const matchSettlement = require('./jobs/matchSettlement');

if (!fs.existsSync('logs'))
  fs.mkdirSync('logs');

const app = express();
const PORT = process.env.PORT || 3050;

app.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'same-origin' },
}));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'tradingfrontend-five.vercel.app').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

app.set('trust proxy', 1);

app.disable('x-powered-by');

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path !== '/health') {
      logger.info(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`, {
        ip: req.ip, userAgent: req.headers['user-agent']?.substring(0, 100),
      });
    }
  });
  next();
});

app.use('/api/', generalLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api', routes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { message: err.message, stack: err.stack, path: req.path });
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  res.status(status).json({ success: false, message });
});

const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  logger.info(`WebSocket available at ws://localhost:${PORT}/ws`);
  if (process.env.NODE_ENV !== 'test') {
    startMonitors();
    priceTrigger.start();
    matchSettlement.start();
  }
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

module.exports = app;
