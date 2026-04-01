import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';

interface HotSearchOverlayProps {
  onClose: () => void;
  initialQuery?: string;
}

const TRENDING_ITEMS = [
  { rank: 1, text: 'US 401(k) Plans May Include Bitcoin', badge: 'HOT' },
  { rank: 2, text: 'Google Warns Bitcoin Encryption Vulnerable to Quantum Computing', badge: null },
  { rank: 3, text: 'Mined in America Act Targets China Deco-coupling', badge: 'HOT' },
  { rank: 4, text: 'Oil Prices Surge 60% as Hormuz Strait Closure Fears Rise', badge: null },
  { rank: 5, text: 'CLARITY Act Faces Industry Skepticism on DeFi Rules', badge: null },
  { rank: 6, text: 'Stablecoin Velocity Doubles Amid Payment Adoption Wave', badge: null },
  { rank: 7, text: 'Aave V4 Launches Hub-and-Spoke Architecture for Liquidity', badge: null },
  { rank: 8, text: 'AI Agent Trading Volume Explodes 2,800% in Q1 2026', badge: 'NEW' },
  { rank: 9, text: 'Altcoins Hit Record Lows Worse Than Previous Crypto Winters', badge: 'NEW' },
];

const ALPHA_ITEMS = [
  { rank: 1, text: 'EQ Token Surges 11,400% — Basonce Exchange Exclusive', badge: 'HOT' },
  { rank: 2, text: 'KITE Launchpool Now Live — Zero-Fee Mining Rewards', badge: 'HOT' },
  { rank: 3, text: 'Basonce Alpha: Top 3 Under-Radar Gems This Week', badge: 'NEW' },
  { rank: 4, text: 'EQL Staking Yields Hit 340% APY Amid Supply Squeeze', badge: null },
  { rank: 5, text: 'PUMP Token Distribution Schedule Announced for Q2', badge: null },
  { rank: 6, text: 'Basonce AI Bot Hits 94% Win Rate on BTC Futures', badge: 'NEW' },
  { rank: 7, text: 'New TradFi Perp Pairs Added: TSLA, NVDA, AAPL', badge: null },
];

const SPOT_ITEMS = [
  { rank: 1, text: 'BTC/USDT — Breakout Confirmed Above $95K Resistance', badge: 'HOT' },
  { rank: 2, text: 'ETH/USDT — Pectra Upgrade Catalyst Incoming', badge: 'HOT' },
  { rank: 3, text: 'SOL/USDT — Weekly Volume ATH on DEX Aggregators', badge: null },
  { rank: 4, text: 'DOGE/USDT — Elon X Post Sparks 18% Intraday Move', badge: 'NEW' },
  { rank: 5, text: 'WIF/USDT — Meme Supercycle Still Running Strong', badge: null },
  { rank: 6, text: 'BONK/USDT — Solana Ecosystem Rotation Begins', badge: null },
  { rank: 7, text: 'PEPE/USDT — L2 Bridge Volume Triples in 48 Hours', badge: 'NEW' },
];

const TABS = ['Trending', 'Alpha Search', 'Spot Search'] as const;

function rankColor(rank: number) {
  if (rank === 1) return '#F6465D';
  if (rank === 2) return '#F0B90B';
  if (rank === 3) return '#E8831D';
  return '#848E9C';
}

export default function HotSearchOverlay({ onClose, initialQuery }: HotSearchOverlayProps) {
  const [query, setQuery] = useState(initialQuery?.replace(/^🔥\s*/, '') ?? '');
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Trending');
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 220);
  };

  const items = activeTab === 'Trending' ? TRENDING_ITEMS : activeTab === 'Alpha Search' ? ALPHA_ITEMS : SPOT_ITEMS;
  const filteredItems = query.trim()
    ? items.filter(i => i.text.toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0B0E11',
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ background: '#181A20', padding: '48px 16px 12px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 2 }}>
        <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <ArrowLeft size={22} color="#fff" />
        </button>

        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: '#2B3139', borderRadius: 10, padding: '9px 12px',
        }}>
          <span style={{ fontSize: 15 }}>🔥</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search coins, news, topics..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#fff', fontSize: 14, caretColor: '#F0B90B',
            }}
          />
          {query ? (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
              <X size={16} color="#848E9C" />
            </button>
          ) : (
            <Search size={16} color="#848E9C" />
          )}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* You May Also Like */}
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 10 }}>You May Also Like</p>
        <div style={{
          background: '#1E2026', borderRadius: 12, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#5B5BFF,#9B59B6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: 16 }}>📰</span>
          </div>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Today's Crypto Headlines</span>
        </div>

        {/* Hot Search Leaderboards */}
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Hot Search Leaderboards</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flexShrink: 0, position: 'relative',
                background: activeTab === tab ? '#2B3139' : 'none',
                border: 'none', borderRadius: 20, padding: '6px 14px',
                cursor: 'pointer', fontSize: 13,
                fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? '#fff' : '#848E9C',
              }}
            >
              {tab}
              {tab === 'Trending' && (
                <span style={{
                  position: 'absolute', top: -4, right: -2,
                  background: '#F0B90B', color: '#000', fontSize: 8,
                  fontWeight: 800, borderRadius: 4, padding: '0px 4px',
                }}>
                  Hot
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Items */}
        <div style={{ paddingBottom: 32 }}>
          {filteredItems.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#848E9C', fontSize: 14 }}>
              No results for "{query}"
            </div>
          )}
          {filteredItems.map((item) => (
            <div
              key={item.rank}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 0', borderBottom: '1px solid #1E2026',
                cursor: 'pointer',
              }}
            >
              <span style={{
                minWidth: 20, textAlign: 'center',
                fontWeight: 800, fontSize: 15,
                color: rankColor(item.rank),
              }}>
                {item.rank}
              </span>
              <span style={{ flex: 1, color: '#E0E0E0', fontSize: 14, lineHeight: 1.4 }}>
                {item.text}
              </span>
              {item.badge && (
                <span style={{
                  background: item.badge === 'HOT' ? '#F6465D22' : '#0ECB8122',
                  color: item.badge === 'HOT' ? '#F6465D' : '#0ECB81',
                  fontSize: 10, fontWeight: 800, borderRadius: 4,
                  padding: '2px 6px', flexShrink: 0,
                }}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </div>

        <p style={{ color: '#4B5563', fontSize: 11, textAlign: 'center', paddingBottom: 24, lineHeight: 1.5 }}>
          This content is generated by AI and could be inaccurate. Please DYOR. Not financial advice.
        </p>
      </div>
    </div>
  );
}
