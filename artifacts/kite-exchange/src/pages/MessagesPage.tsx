import { useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';

interface MessagesPageProps {
  onClose: () => void;
}

const CATEGORIES = [
  {
    id: 'chat',
    label: 'Chat',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C6CBD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7l-4 3V6a2 2 0 0 1 2-2z" />
        <line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="13" x2="13" y2="13" />
      </svg>
    ),
    preview: null, date: null,
    messages: [],
  },
  {
    id: 'announcement',
    label: 'Announcement',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C6CBD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l19-9-9 19-2-8-8-2z" />
      </svg>
    ),
    preview: 'Important Update Regarding Spot Trading Fees',
    date: '10/30/2025',
    messages: [
      {
        id: 1, title: 'Important Update Regarding Spot Trading Fees',
        date: 'Oct 30, 2025',
        body: `Dear Basonce Exchange User,

We are updating our Spot trading fee structure effective November 1, 2025.

**New Fee Structure:**
- Maker fee: 0.080% → 0.075%
- Taker fee: 0.100% → 0.090%

**BNC holders receive additional discounts:**
- Hold 100 BNC: 10% fee discount
- Hold 500 BNC: 20% fee discount
- Hold 1,000 BNC: 30% fee discount

These changes are part of our commitment to providing the most competitive trading environment in the market.

Thank you for being a valued member of the Basonce Exchange community.`,
      },
      {
        id: 2, title: 'New Trading Pairs Added — EQ, POWERAI, PAYAI',
        date: 'Oct 15, 2025',
        body: `We are pleased to announce the addition of three new spot trading pairs:

**EQ/USDT** — EqualProtocol decentralized identity token
**POWERAI/USDT** — AI infrastructure and compute network
**PAYAI/USDT** — AI-powered payments protocol

All pairs are available now with zero fees for the first 7 days. Deposit and start trading today.

Risk warning: Newly listed assets carry higher volatility risk. Please trade responsibly.`,
      },
    ],
  },
  {
    id: 'campaign',
    label: 'Campaign',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C6CBD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
    preview: 'Share 110M PUMP & 920K KITE — Join Now',
    date: 'Active',
    messages: [
      {
        id: 1, title: '🎁 Share 110M PUMP & 920K KITE Tokens',
        date: 'Ongoing — Ends Apr 30, 2026',
        body: `**Campaign Details**

Basonce Exchange is distributing 110,000,000 PUMP tokens and 920,000 KITE tokens to active community members.

**How to participate:**
1. Complete your KYC verification
2. Maintain any positive balance on Basonce Exchange
3. Trade at least $50 in volume during the campaign period
4. Invite friends using your referral link for bonus multipliers

**Reward tiers:**
- Bronze (≥$50 volume): 500 PUMP + 50 KITE
- Silver (≥$500 volume): 5,000 PUMP + 500 KITE
- Gold (≥$5,000 volume): 50,000 PUMP + 5,000 KITE

Rewards distributed within 14 days of campaign end. Check your wallet section.`,
      },
      {
        id: 2, title: 'Zero-Fee Trading Week — All Spot Pairs',
        date: 'Apr 1–7, 2026',
        body: `To celebrate our growing community, Basonce Exchange is offering zero trading fees on all spot pairs for one full week.

**Period:** April 1 – April 7, 2026 (00:00 UTC – 23:59 UTC)
**Eligible pairs:** All USDT spot pairs
**Max benefit per user:** Uncapped

This is the perfect time to rebalance your portfolio or enter new positions without fee drag.

No action required — fees are automatically waived during the campaign period.`,
      },
    ],
  },
  {
    id: 'square',
    label: 'Square',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C6CBD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    preview: 'New posts from traders you follow',
    date: '03:56',
    messages: [
      {
        id: 1, title: 'New activity in Square',
        date: 'Today 03:56',
        body: `**3 new posts from traders you follow:**

**@CryptoWhale_X** — "BTC holding strong above $95K. My target remains $118K this cycle. Positioned long with 3x leverage on Basonce Futures. $BTC"

**@AlphaHunter99** — "EQ token is the most undervalued asset in the market right now. 11,400% gain from listing and still early. $EQ $BNC"

**@TradingMaster** — "Just withdrew $2,400 from my Basonce mining rewards this month. Mining Farm Pro is printing. $KITE"

Visit the Discover tab to see the full feed and interact with these posts.`,
      },
    ],
  },
  {
    id: 'price-alert',
    label: 'Price Alert',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C6CBD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    preview: 'BTC Price Alert 📈',
    date: '03/31',
    messages: [
      {
        id: 1, title: 'BTC Price Alert — Target Hit 📈',
        date: 'Mar 31, 2026 · 14:22',
        body: `**Bitcoin (BTC/USDT) has reached your target price.**

Your alert: BTC price above $95,000
Current price: **$95,847**
Change: +4.32% in last 24h

BTC has broken out above the key $95,000 resistance level with strong volume confirmation. This level has now flipped to support.

**Quick actions:**
• View BTC/USDT chart
• Place a buy order
• Set a new price alert

Your alert has been triggered and removed. Set a new alert in the Markets section.`,
      },
      {
        id: 2, title: 'BNC Price Alert — New All-Time High 🚀',
        date: 'Mar 28, 2026 · 09:15',
        body: `**BNC/USDT has reached a new all-time high!**

Your alert: BNC above $4.50
Current price: **$5.13**
All-time high: **$5.13** (Just set!)
Change: +28.4% in last 7 days

BNC, Basonce Exchange's native token, has reached a new all-time high amid increased platform activity and the ongoing mining campaign.

Congratulations to all BNC holders. The token continues to outperform the broader market.`,
      },
      {
        id: 3, title: 'EQ Price Alert — Down 12% from Peak ⚠️',
        date: 'Mar 25, 2026 · 22:44',
        body: `**EQ/USDT has dropped below your alert threshold.**

Your alert: EQ below $0.045
Current price: **$0.0438**
Change: -12.3% from 24h high

EQ has pulled back from its recent peak. This may present a buying opportunity or a signal to review your position.

**Note:** EQ remains up +10,800% from its listing price. Short-term volatility is normal for high-momentum assets.

Consider setting a stop-loss or reviewing your risk exposure.`,
      },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C6CBD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    preview: 'Login attempted from new IP address',
    date: '03/29',
    messages: [
      {
        id: 1, title: 'New Login Detected',
        date: 'Mar 29, 2026 · 11:34',
        body: `**A login to your Basonce account was detected.**

Device: iPhone 14 Pro
Location: Istanbul, Turkey
IP Address: 185.xxx.xxx.xxx
Time: March 29, 2026 · 11:34 AM UTC

If this was you, no action is required.

If you do not recognize this login, please:
1. Change your password immediately
2. Enable Two-Factor Authentication (2FA)
3. Contact Basonce Support

Your account security is our top priority.`,
      },
      {
        id: 2, title: 'KYC Verification Approved ✅',
        date: 'Mar 15, 2026 · 09:00',
        body: `**Your identity verification has been approved.**

Verification level: Standard KYC
Daily withdrawal limit: $50,000 USDT
Spot trading: Fully enabled
Futures trading: Fully enabled

You can now access all features on Basonce Exchange, including campaign eligibility and higher withdrawal limits.

Thank you for completing verification.`,
      },
    ],
  },
  {
    id: 'transaction',
    label: 'Transaction',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C6CBD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
    preview: 'USDT Withdrawal Successful',
    date: '03/11',
    messages: [
      {
        id: 1, title: 'USDT Withdrawal Successful ✅',
        date: 'Mar 11, 2026 · 15:22',
        body: `**Your withdrawal has been processed successfully.**

Asset: USDT (TRC20)
Amount: **250.00 USDT**
Network fee: 1.00 USDT
Amount received: 249.00 USDT
Destination: TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TxID: 0x7f3a...d92e
Status: Confirmed (3/3 confirmations)

Funds typically arrive within 5–30 minutes depending on network congestion.`,
      },
      {
        id: 2, title: 'Deposit Confirmed — 100 USDT',
        date: 'Mar 8, 2026 · 10:05',
        body: `**Your deposit has been credited to your account.**

Asset: USDT (TRC20)
Amount: **100.00 USDT**
From: External wallet
TxID: 0x4a2b...f71c
Status: Confirmed

Your balance has been updated. You can now trade or use this balance for any platform feature.`,
      },
      {
        id: 3, title: 'Mining Reward Withdrawn — 45 KITE',
        date: 'Mar 5, 2026 · 08:30',
        body: `**Your KITE mining reward has been credited.**

Asset: KITE
Amount: **45.00 KITE**
Source: Mining Farm Pro (24h reward)
Status: Credited to Spot Wallet

Your mining equipment continues to generate rewards. Visit the Mining section to track your progress and upgrade your equipment for higher yields.`,
      },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing & Activities',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C6CBD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    preview: '[Basonce] USD-M Futures Liquidation Warning',
    date: '03/11',
    messages: [
      {
        id: 1, title: '⚠️ Futures Position Liquidation Warning',
        date: 'Mar 11, 2026 · 12:05',
        body: `**Your futures position is approaching the liquidation price.**

Pair: BTC/USDT Perpetual
Side: Long
Size: 0.05 BTC
Entry Price: $92,400
Liquidation Price: **$89,200**
Current Price: $89,850
Margin Ratio: 87%

**Immediate action required:**
- Add margin to your position to avoid liquidation
- Reduce your position size
- Or close the position manually

Failure to act may result in automatic liquidation and loss of your margin.`,
      },
      {
        id: 2, title: 'Referral Bonus Credited — $12.50 USDT',
        date: 'Mar 11, 2026 · 08:20',
        body: `**Your referral has made their first trade!**

Referred user: User #xxxxx
Your commission: **$12.50 USDT** (25% of trading fees)
Credited to: Rewards wallet

You have earned a total of $87.50 USDT in referral commissions to date.

Keep sharing your referral link to earn more. Top referrers this month win bonus KITE tokens.`,
      },
    ],
  },
  {
    id: 'others',
    label: 'Others',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C6CBD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="3" /><circle cx="15" cy="15" r="3" />
        <path d="M9 3h6M9 21h6M3 9v6M21 9v6" />
      </svg>
    ),
    preview: 'USD-M Futures Liquidation Call',
    date: '03/11',
    messages: [
      {
        id: 1, title: 'Futures Liquidation Executed',
        date: 'Mar 11, 2026 · 12:18',
        body: `**Your futures position has been liquidated.**

Pair: BTC/USDT Perpetual
Side: Long
Size: 0.05 BTC
Entry Price: $92,400
Liquidation Price: $89,200
Execution Price: $89,185
Loss: -$158.00 USDT

Your position was liquidated because the margin ratio reached 100%.

**Suggestions:**
• Use lower leverage (≤5x) to reduce liquidation risk
• Set stop-loss orders before entering positions
• Never risk more than you can afford to lose

Visit our Futures Learning Center for risk management tips.`,
      },
      {
        id: 2, title: 'System Maintenance Completed',
        date: 'Mar 5, 2026 · 04:00',
        body: `**Scheduled system maintenance has been completed.**

Duration: 2 hours (02:00 – 04:00 UTC)
Impact: Temporary suspension of withdrawals and deposits
Status: All systems fully operational

All pending withdrawals during maintenance have been processed. Your balances are accurate and up to date.

Thank you for your patience. We apologize for any inconvenience.`,
      },
    ],
  },
];

type Message = { id: number; title: string; date: string; body: string };
type Category = typeof CATEGORIES[number];

export default function MessagesPage({ onClose }: MessagesPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const renderMessageDetail = (msg: Message) => (
    <div style={{ position: 'absolute', inset: 0, background: '#0B0E11', zIndex: 20, overflowY: 'auto' }}>
      <div style={{
        background: '#181A20', padding: '48px 16px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 2,
        borderBottom: '1px solid #2B3139',
      }}>
        <button onClick={() => setSelectedMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <ArrowLeft size={22} color="#fff" />
        </button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, flex: 1 }}>{selectedCategory?.label}</span>
      </div>

      <div style={{ padding: '20px 18px 48px' }}>
        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 800, lineHeight: 1.4, marginBottom: 8 }}>{msg.title}</h2>
        <p style={{ color: '#848E9C', fontSize: 12, marginBottom: 20 }}>{msg.date}</p>
        <div style={{ height: 1, background: '#2B3139', marginBottom: 20 }} />

        {msg.body.split('\n\n').map((para, i) => {
          const parts = para.split(/(\*\*[^*]+\*\*)/g);
          return (
            <p key={i} style={{ color: '#C6CBD4', fontSize: 15, lineHeight: 1.8, marginBottom: 14 }}>
              {parts.map((part, j) =>
                part.startsWith('**') && part.endsWith('**')
                  ? <strong key={j} style={{ color: '#fff', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
                  : part
              )}
            </p>
          );
        })}
      </div>
    </div>
  );

  const renderCategoryDetail = (cat: Category) => (
    <div style={{ position: 'absolute', inset: 0, background: '#0B0E11', zIndex: 10, overflowY: 'auto' }}>
      <div style={{
        background: '#181A20', padding: '48px 16px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 2,
        borderBottom: '1px solid #2B3139',
      }}>
        <button onClick={() => setSelectedCategory(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <ArrowLeft size={22} color="#fff" />
        </button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, flex: 1 }}>{cat.label}</span>
      </div>

      <div style={{ padding: '12px 0 48px' }}>
        {cat.messages.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
            <p style={{ color: '#848E9C', fontSize: 15 }}>No messages yet</p>
          </div>
        ) : (
          cat.messages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => setSelectedMessage(msg)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 18px',
                borderBottom: '1px solid #1E2026',
                cursor: 'pointer',
                background: 'transparent',
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: '#1E2026', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2,
              }}>
                {cat.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, lineHeight: 1.3, flex: 1 }}>{msg.title}</p>
                  <span style={{ color: '#848E9C', fontSize: 11, flexShrink: 0, marginTop: 2 }}>{msg.date}</span>
                </div>
                <p style={{
                  color: '#848E9C', fontSize: 12, marginTop: 4, lineHeight: 1.4,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {msg.body.replace(/\*\*/g, '').split('\n')[0]}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedMessage && renderMessageDetail(selectedMessage)}
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0B0E11', zIndex: 9998, overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        background: '#181A20', padding: '48px 16px 14px',
        display: 'flex', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 2,
        borderBottom: '1px solid #2B3139',
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', marginRight: 12 }}>
          <ArrowLeft size={22} color="#fff" />
        </button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 18, flex: 1, textAlign: 'center' }}>Messages</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C6CBD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C6CBD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Category list */}
      <div style={{ padding: '8px 0 48px' }}>
        {CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            onClick={() => setSelectedCategory(cat)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px',
              borderBottom: '1px solid #1E2026',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 46, height: 46, borderRadius: 14,
              background: '#1E2026',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {cat.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{cat.label}</span>
                {cat.date && (
                  <span style={{ color: '#848E9C', fontSize: 12 }}>{cat.date}</span>
                )}
              </div>
              {cat.preview && (
                <p style={{
                  color: '#848E9C', fontSize: 13, marginTop: 3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {cat.preview}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedCategory && renderCategoryDetail(selectedCategory)}
    </div>
  );
}
