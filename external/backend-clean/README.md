# Swift Trading Platform Backend VPS Deployment Guide

> A step-by-step guide from scratch until the backend is running in production on a VPS, plus full documentation for all APIs.
> Replace `yourdomain.com` everywhere with your actual domain (api.basonce.com.com).

---

## Contents

1. [Prerequisites](#prerequisites)
2. [Part 1: Setting Up the Server from Scratch](#part-1-setting-up-the-server-from-scratch)
3. [Part 2: Uploading the Project and Setting Up the Database](#part-2-uploading-the-project-and-setting-up-the-database)
4. [Part 3: Running the Server with PM2](#part-3-running-the-server-with-pm2)
5. [Part 4: Nginx + SSL](#part-4-nginx--ssl)
6. [Part 5: Verifying Everything Works](#part-5-verifying-everything-works)
7. [Full API Documentation](#full-api-documentation)
8. [Important Security Notes](#important-security-notes)

---

## Prerequisites

- A VPS running Ubuntu 22.04 (or a similar distro).
- Root access or a user with sudo privileges.
- A domain pointed (A Record) to the server's IP (`yourdomain.com`).
- The project (the backend files you currently have).

---

## Part 1: Setting Up the Server from Scratch

### 1. Update the system

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js (LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### 3. Install MySQL / MariaDB

```bash
sudo apt install -y mariadb-server mariadb-client
sudo mysql_secure_installation
```

Inside `mysql_secure_installation`, answer:
- Set root password → Yes (use a strong password)
- Remove anonymous users → Yes
- Disallow root login remotely → Yes
- Remove test database → Yes
- Reload privilege tables → Yes

### 4. Create the database and the project's dedicated user

```bash
sudo mysql -u root -p
```

Inside the MySQL shell:

```sql
CREATE DATABASE swift CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'swift'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON swift.* TO 'swift'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

> Keep the password you set — you'll put it in `.env` later.

### 5. Install Redis

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping   # Should return PONG
```

### 6. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 7. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### 8. Set up the Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## Part 2: Uploading the Project and Setting Up the Database

### 1. Create the project folder and upload the files

```bash
sudo mkdir -p /var/www/swift-backend
sudo chown -R $USER:$USER /var/www/swift-backend
cd /var/www/swift-backend
```

Upload the project files here (via `scp`, `rsync`, or `git clone` if hosted on a private repo). Example using `scp` from your machine:

```bash
scp -r ./backend/* your_user@your_server_ip:/var/www/swift-backend/
```

### 2. Install dependencies

```bash
cd /var/www/swift-backend
npm install --production
```

### 3. Set up the `.env` file

Copy `.env.example` and rename it to `.env`:

```bash
cp .env.example .env
nano .env
```

Fill in the following values (all sensitive values have been removed, you must fill them in yourself):

```env
PORT=3050
NODE_ENV=production
APP_URL=https://api.basonce.com
ALLOWED_ORIGINS=https://basonce.com
FRONTEND_URL=https://basonce.com

DB_HOST=localhost
DB_PORT=3306
DB_NAME=swift
DB_USER=swift
DB_PASSWORD=CHANGE_THIS_PASSWORD

JWT_SECRET=<generate-random-64-byte-hex>
JWT_REFRESH_SECRET=<generate-random-64-byte-hex>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

SMTP_HOST=mail.yourdomain.com
SMTP_PORT=465
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=<smtp-password>
EMAIL_FROM=Swift Trading<noreply@yourdomain.com>

KUCOIN_API_KEY=<if-used>
KUCOIN_API_SECRET=<if-used>
KUCOIN_PASSPHRASE=<if-used>
KUCOIN_BASE_URL=https://api.kucoin.com

REDIS_URL=redis://localhost:6379

BCRYPT_ROUNDS=12
PLATFORM_FEE_PERCENT=1
ENCRYPTION_KEY=<generate-random-hex>

SUPPORTED_PEERS=BTC,ETH,BNB,XRP,ADA,SOL,DOGE,TRX,LTC,MATIC,ATOM,ALGO,ZEC,WIN,ONE,DAG,DASH,DGB,USDT

CMC_API_KEY=<coinmarketcap-api-key>

NOWPAYMENTS_API_KEY=<nowpayments-api-key>
NOWPAYMENTS_IPN_SECRET=<nowpayments-ipn-secret>

FOOTBALL_DATA_API_KEY=<football-data-api-key>
```

To generate a random, secure `JWT_SECRET` and `ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Import the database

```bash
mysql -u swift -p swift < database.sql
```

### 5. Create an Admin account

```bash
cd /var/www/swift-backend
ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD='ChangeThis123!' ADMIN_NAME='Super Admin' node scripts/createAdmin.js
```

> Change the password immediately after the first login.

---

## Part 3: Running the Server with PM2

The project has a ready-made `ecosystem.config.js` with production settings (cluster mode).

### Running the project

```bash
cd /var/www/swift-backend
pm2 start ecosystem.config.js --env production
```

### Important commands

```bash
pm2 status                 # process status
pm2 logs trading-platform  # live logs
pm2 restart trading-platform
pm2 stop trading-platform
```

### Enabling PM2 to auto-start on any server reboot

```bash
pm2 save
pm2 startup
# Run the command PM2 prints for you (starts with sudo env PATH=...)
```

---

## Part 4: Nginx + SSL

### 1. Create the config file

```bash
sudo nano /etc/nginx/sites-available/yourdomain.com
```

Paste this config (change `yourdomain.com` and the port if different from `3050`):

```nginx
server {
    listen 80;
    server_name api.basonce.com www.api.basonce.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.basonce.com.com www.api.basonce.com.com;

    # Will be added automatically when you run certbot below
    # ssl_certificate     /etc/letsencrypt/live/api.basonce.com.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:3050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 2. Enable the config

```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Install a free SSL certificate (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will automatically edit the nginx file and add the certificates, and set up auto-renewal. You can verify renewal is working with:

```bash
sudo certbot renew --dry-run
```

---

## Part 5: Verifying Everything Works

```bash
curl https://yourdomain.com/health
```

You should get back:

```json
{ "status": "ok", "timestamp": "..." }
```

Also make sure to check:

```bash
pm2 logs trading-platform --lines 50
sudo tail -f /var/log/nginx/error.log
```

---

## Full API Documentation

**Base URL:** `https://yourdomain.com/api`

**Standard response format across all endpoints:**

```json
{ "success": true, "message": "...", "data": { } }
```

On error:

```json
{ "success": false, "message": "reason for the error" }
```

**Authentication:** Any endpoint marked with 🔒 requires sending the JWT access token in the header:

```
Authorization: Bearer <access_token>
```

**Rate Limiting:** There are different limiters for auth, register, trade, withdraw, email depending on the endpoint (429 if you exceed the limit).

---

### 1. Market (public data — no login required)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/market/tickers` | All current prices for all pairs |
| GET | `/market/ticker/:symbol` | Price of a specific pair, e.g. `BTC-USDT` |
| GET | `/market/symbols` | List of all pairs available for trading |
| GET | `/market/orderbook/:symbol` | Order book for a specific pair |
| GET | `/market/trades/:symbol` | Latest executed trades for a specific pair |
| GET | `/market/candles/:symbol` | Candlestick data for a specific pair |

---

### 2. Auth (login and accounts)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new account |
| GET | `/auth/verify-email` | Activate email via the token sent by email |
| POST | `/auth/resend-verification` | Resend the activation email |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh the access token |
| POST | `/auth/logout` 🔒 | Logout (revoke the token) |
| POST | `/auth/forgot-password` | Request password recovery |
| POST | `/auth/reset-password` | Set a new password using the token |
| GET | `/auth/me` 🔒 | Current user's data |

**POST `/auth/register`**
```json
{
  "email": "user@example.com",
  "password": "Str0ng@Pass",
  "full_name": "Ahmed Ali"
}
```
Password requirements: at least 8 characters, containing an uppercase letter, a lowercase letter, a number, and a special character (`@$!%*?&`).

**POST `/auth/login`**
```json
{ "email": "user@example.com", "password": "Str0ng@Pass" }
```

**POST `/auth/refresh`**
```json
{ "refresh_token": "<refresh_token>" }
```

**POST `/auth/forgot-password`**
```json
{ "email": "user@example.com" }
```

**POST `/auth/reset-password`**
```json
{ "token": "<reset_token>", "password": "NewStr0ng@Pass" }
```

---

### 3. Wallet 🔒

| Method | Endpoint | Description |
|---|---|---|
| GET | `/wallet/balance` | Wallet balance (USDT) — balance / locked / available |
| GET | `/wallet/transactions?page=&limit=&type=` | Wallet transaction history |

---

### 4. Deposit 🔒

| Method | Endpoint | Description |
|---|---|---|
| GET | `/deposit/peers` | List of coins supported for deposit |
| GET | `/deposit/address/:coin?network=` | Deposit address for a specific coin, e.g. `/deposit/address/USDT?network=trc20` |
| GET | `/deposit/history` | Deposit history |

---

### 5. Trade — Spot Trading 🔒

| Method | Endpoint | Description |
|---|---|---|
| POST | `/trade/order` | Open a buy/sell order |
| GET | `/trade/orders` | Currently open orders |
| GET | `/trade/history` | History of executed trades |
| GET | `/trade/order/:id` | Details of a specific order |
| DELETE | `/trade/order/:id` | Cancel an open order |
| GET | `/trade/assets` | All coin balances owned by the user |
| GET | `/trade/ticker/:symbol` | Price of a specific pair (parallel route to market) |

**POST `/trade/order`**
```json
{
  "symbol": "BTC-USDT",
  "side": "buy",
  "type": "market",
  "amount": 0.01,
  "price": 65000
}
```
- `symbol`: in `BASE-QUOTE` format, e.g. `BTC-USDT`
- `side`: `buy` or `sell`
- `type`: `market` or `limit` (optional, default `market`)
- `amount`: positive number
- `price`: required only if `type` = `limit`

---

### 6. Futures 🔒

| Method | Endpoint | Description |
|---|---|---|
| POST | `/futures/order` | Open a futures position (long/short) |
| POST | `/futures/close/:id` | Close an open position |
| PATCH | `/futures/position/:id` | Modify Take Profit / Stop Loss |
| GET | `/futures/positions` | Currently open positions |
| GET | `/futures/history` | History of closed positions |
| GET | `/futures/orders` | Futures order history |

**POST `/futures/order`**
```json
{
  "symbol": "BTC-USDT",
  "side": "long",
  "leverage": 10,
  "type": "market",
  "amount": 0.05,
  "price": 65000
}
```
- `side`: `long` or `short`
- `leverage`: a number between 1 and the max leverage allowed for the pair
- `price`: required only if `type` = `limit`

---

### 7. Match Bets (football match betting) 🔒

| Method | Endpoint | Description |
|---|---|---|
| POST | `/match-bets` | Place a bet on a match |
| GET | `/match-bets/upcoming/:competition` | Upcoming matches in a specific competition |
| GET | `/match-bets` | Current user's bets |
| GET | `/match-bets/:id` | Details of a specific bet |

**POST `/match-bets`**
```json
{
  "match_id": "12345",
  "pick": "home",
  "stake_usdt": 10,
  "odds": 1.9
}
```
- `pick`: `home`, `draw`, or `away`
- `stake_usdt`: between 1 and 1000

---

### 8. NOWPayments (deposit payment gateway)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/nowpayments/ipn` | Webhook received automatically from NOWPayments (no login required) |
| GET | `/nowpayments/min-amount/:currency` 🔒 | Minimum deposit amount allowed for a specific coin |
| GET | `/nowpayments/min-amounts` 🔒 | Minimum deposit amounts for all coins |

> `/nowpayments/ipn` must be registered as the IPN callback URL in the NOWPayments dashboard:
> `https://yourdomain.com/api/nowpayments/ipn`

---

### 9. Withdraw

| Method | Endpoint | Description |
|---|---|---|
| POST | `/withdraw/request` 🔒 | Request a withdrawal |
| POST | `/withdraw/ipn` | Withdrawal confirmation webhook (no login required) |
| GET | `/withdraw/history` 🔒 | Withdrawal history |
| GET | `/withdraw/fees` 🔒 | Withdrawal fees per coin |
| GET | `/withdraw/:id` 🔒 | Details of a specific withdrawal |

**POST `/withdraw/request`**
```json
{
  "coin": "USDT",
  "network": "trc20",
  "address": "TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "amount": 50,
  "memo": ""
}
```

---

### 10. Admin 🔒 (requires `is_admin = true`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/stats` | Dashboard statistics |
| GET | `/admin/users` | All users |
| GET | `/admin/users/:id` | Details of a specific user |
| PATCH | `/admin/users/:id/status` | Enable/disable a user account |
| POST | `/admin/users/:id/credit` | Manually credit a user's balance |
| GET | `/admin/deposits` | All deposit transactions |
| GET | `/admin/withdrawals` | All withdrawal transactions |
| POST | `/admin/withdrawals/:id/reject` | Reject a withdrawal request |
| GET | `/admin/fees` | Report of collected fees |
| GET | `/admin/audit-logs` | Audit log |

**PATCH `/admin/users/:id/status`**
```json
{ "is_active": false }
```

**POST `/admin/users/:id/credit`**
```json
{ "amount": 100 }
```

---

### 11. Admin — Trading Pairs 🔒 (requires `is_admin = true`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/trading-pairs` | All trading pairs |
| POST | `/admin/trading-pairs` | Add a new trading pair |
| PUT | `/admin/trading-pairs/:symbol` | Edit an existing pair |
| DELETE | `/admin/trading-pairs/:symbol` | Delete a pair |
| GET | `/admin/trading-pairs/:symbol/price` | Preview the current price for the pair before saving |

**POST `/admin/trading-pairs`**
```json
{
  "symbol": "BTC-USDT",
  "base_coin": "BTC",
  "display_name": "Bitcoin",
  "cmc_id": 1,
  "is_active": 1,
  "is_spot": 1,
  "is_futures": 1,
  "spread_buy": 0.01,
  "spread_sell": 0.01,
  "min_trade_usdt": 1,
  "max_trade_usdt": 100000,
  "max_leverage": 100,
  "has_memo": 0,
  "networks": [{ "id": "trc20", "label": "TRC20" }],
  "sort_order": 0
}
```

---

### 12. WebSocket (live data)

```
wss://yourdomain.com/ws
```

Used to broadcast live market prices and updates to the frontend (order book / tickers / user trades). The connection passes through the same Nginx reverse proxy as any regular request (see the `/ws` config in [Part 4](#part-4-nginx--ssl)).

---

## Important Security Notes

- **Never leave `.env` anywhere public** and never push it to git without a `.gitignore`.
- **Change the Admin password** immediately after the first login following `createAdmin.js`.
- **Use long, random values** for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `ENCRYPTION_KEY` (at least 64 bytes hex).
- **Always enable SSL** (`https`) before putting the domain anywhere in production.
- **Review `ALLOWED_ORIGINS`** in `.env` and keep it limited to only the domains that actually need to talk to the API.
- **Take regular backups** of the database:
  ```bash
  mysqldump -u swift -p swift > backup_$(date +%F).sql
  ```
- **Monitor the logs regularly**: `pm2 logs` and `/var/log/nginx/error.log`.
