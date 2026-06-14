import { useState } from 'react';
import {
  Code2,
  Webhook,
  Network,
  Zap,
  Lock,
  Activity,
  Terminal,
  Boxes,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

const PRODUCTS = [
  {
    icon: Network,
    name: 'REST API',
    tag: 'HTTP / JSON',
    desc: 'Full account, spot, margin and futures coverage. Stateless requests for orders, balances, transfers and market data.',
    points: ['1,200 weight / min', 'IP & key based limits', 'HMAC-SHA256 signing'],
  },
  {
    icon: Webhook,
    name: 'WebSocket API',
    tag: 'Streaming',
    desc: 'Sub-10ms market data and user-data streams. Real-time order book diffs, trades, klines and account events.',
    points: ['< 10 ms latency', '300 streams / connection', 'Auto re-subscribe'],
  },
  {
    icon: Boxes,
    name: 'FIX API',
    tag: 'Institutional',
    desc: 'FIX 4.4 order entry and drop-copy sessions for high-frequency desks and prime brokerage integrations.',
    points: ['Co-located gateways', 'Drop-copy sessions', 'Dedicated support'],
  },
];

const SDKS = [
  { lang: 'Python', pkg: 'basonce-connector-python', mgr: 'pip install' },
  { lang: 'Node.js', pkg: '@basonce/connector', mgr: 'npm install' },
  { lang: 'Java', pkg: 'com.basonce:connector', mgr: 'maven' },
  { lang: 'Go', pkg: 'github.com/basonce/go-connector', mgr: 'go get' },
  { lang: 'Rust', pkg: 'basonce-connector', mgr: 'cargo add' },
  { lang: 'C#', pkg: 'Basonce.Net', mgr: 'dotnet add' },
];

const RATE_TABLE = [
  { tier: 'Default', weight: '1,200', orders: '50 / 10s', ws: '300', co: 'No' },
  { tier: 'VIP 1–3', weight: '6,000', orders: '100 / 10s', ws: '500', co: 'No' },
  { tier: 'VIP 4–6', weight: '12,000', orders: '200 / 10s', ws: '1,000', co: 'Optional' },
  { tier: 'VIP 7–9', weight: '24,000', orders: '300 / 10s', ws: '2,000', co: 'Included' },
  { tier: 'Institutional', weight: 'Custom', orders: 'Custom', ws: 'Custom', co: 'Included' },
];

const ENDPOINTS: Record<string, { method: string; path: string; desc: string }[]> = {
  Spot: [
    { method: 'GET', path: '/api/v3/ticker/price', desc: 'Latest price for a symbol' },
    { method: 'GET', path: '/api/v3/depth', desc: 'Order book up to 5000 levels' },
    { method: 'POST', path: '/api/v3/order', desc: 'Place a new spot order' },
    { method: 'DELETE', path: '/api/v3/order', desc: 'Cancel an active order' },
  ],
  Futures: [
    { method: 'GET', path: '/fapi/v1/premiumIndex', desc: 'Mark price & funding rate' },
    { method: 'POST', path: '/fapi/v1/order', desc: 'Place a futures order' },
    { method: 'POST', path: '/fapi/v1/leverage', desc: 'Change initial leverage' },
    { method: 'GET', path: '/fapi/v2/positionRisk', desc: 'Open position risk data' },
  ],
  Account: [
    { method: 'GET', path: '/api/v3/account', desc: 'Account balances & status' },
    { method: 'POST', path: '/sapi/v1/asset/transfer', desc: 'Universal account transfer' },
    { method: 'GET', path: '/sapi/v1/capital/deposit', desc: 'Deposit history' },
    { method: 'POST', path: '/sapi/v1/capital/withdraw', desc: 'Submit a withdrawal' },
  ],
};

const SNIPPET = `import requests, time, hmac, hashlib
from urllib.parse import urlencode

API_KEY    = "YOUR_API_KEY"
API_SECRET = b"YOUR_API_SECRET"
BASE       = "https://api.basonce.com"

def signed_get(path, params):
    params["timestamp"] = int(time.time() * 1000)
    query = urlencode(params)
    sig   = hmac.new(API_SECRET, query.encode(),
                     hashlib.sha256).hexdigest()
    url   = f"{BASE}{path}?{query}&signature={sig}"
    return requests.get(url, headers={"X-BSC-APIKEY": API_KEY})

# Fetch spot account balances
resp = signed_get("/api/v3/account", {"recvWindow": 5000})
print(resp.json())`;

export default function ApiPage({ onNavigate }: MorePageProps) {
  const [tab, setTab] = useState<keyof typeof ENDPOINTS>('Spot');
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(SNIPPET).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans selection:bg-[#F0B90B] selection:text-black">
      {/* Hero — terminal flavored */}
      <section className="relative pt-24 pb-20 border-b border-[#2B3139] overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(#F0B90B 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#181A20] border border-[#2B3139] text-[#F0B90B] text-xs font-semibold tracking-wider uppercase mb-7">
              <Terminal className="w-4 h-4" />
              Developer Portal
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight">
              Build on the <span className="text-[#F0B90B]">Basonce API</span>
            </h1>
            <p className="mt-6 text-lg text-[#848E9C] leading-relaxed max-w-xl">
              Programmatic access to spot, margin and derivatives markets. Low-latency
              data, deep liquidity and battle-tested infrastructure powering algorithmic
              desks, market makers and fintech apps worldwide.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <button onClick={openAuthRegister} className="px-7 py-3.5 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-semibold rounded transition-colors flex items-center gap-2">
                Create API Key
                <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => onNavigate('trade')} className="px-7 py-3.5 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] text-white font-semibold rounded transition-colors">
                Explore Markets
              </button>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-[#848E9C]">
              <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-[#0ECB81]" /> 99.99% uptime</span>
              <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-[#0ECB81]" /> HMAC + Ed25519 keys</span>
              <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-[#0ECB81]" /> Real-time streams</span>
            </div>
          </div>

          {/* Code panel */}
          <div className="rounded-lg border border-[#2B3139] bg-[#0d1014] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2B3139] bg-[#181A20]">
              <div className="flex items-center gap-2 min-w-0">
                <Code2 className="w-4 h-4 text-[#F0B90B] shrink-0" />
                <span className="text-sm text-[#B7BDC6] font-mono truncate">account_balance.py</span>
              </div>
              <button onClick={copy} className="flex items-center gap-1.5 text-xs text-[#848E9C] hover:text-[#F0B90B] transition-colors shrink-0">
                {copied ? <Check className="w-3.5 h-3.5 text-[#0ECB81]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-5 text-[13px] leading-relaxed font-mono text-[#B7BDC6] overflow-x-auto"><code>{SNIPPET}</code></pre>
          </div>
        </div>
      </section>

      {/* Product cards */}
      <section className="py-20 bg-[#0d1014]">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl font-bold mb-3">Connectivity options</h2>
          <p className="text-[#848E9C] mb-12 max-w-2xl">Choose the integration that fits your strategy — from simple REST polling to institutional FIX order entry.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {PRODUCTS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.name} className="bg-[#181A20] border border-[#2B3139] rounded-lg p-7 hover:border-[#F0B90B]/50 transition-colors flex flex-col">
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded bg-[#2B3139] flex items-center justify-center text-[#F0B90B]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#0d1014] border border-[#2B3139] text-[#848E9C] whitespace-nowrap">{p.tag}</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{p.name}</h3>
                  <p className="text-[#848E9C] text-sm leading-relaxed mb-5 flex-1">{p.desc}</p>
                  <ul className="space-y-2">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-2 text-sm text-[#B7BDC6]">
                        <Check className="w-4 h-4 text-[#0ECB81] shrink-0" />
                        <span className="truncate min-w-0">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Endpoint explorer */}
      <section className="py-20 bg-[#0B0E11] border-t border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl font-bold mb-8">Endpoint reference</h2>
          <div className="flex gap-2 mb-6 flex-wrap">
            {(Object.keys(ENDPOINTS) as (keyof typeof ENDPOINTS)[]).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-5 py-2.5 rounded text-sm font-semibold transition-colors ${tab === k ? 'bg-[#F0B90B] text-black' : 'bg-[#181A20] text-[#B7BDC6] hover:bg-[#2B3139] border border-[#2B3139]'}`}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-[#2B3139] overflow-hidden">
            {ENDPOINTS[tab].map((e, i) => (
              <div key={e.path} className={`flex items-center gap-4 px-5 py-4 ${i % 2 ? 'bg-[#0d1014]' : 'bg-[#181A20]'}`}>
                <span className={`text-xs font-bold w-16 text-center py-1 rounded shrink-0 ${e.method === 'GET' ? 'bg-[#0ECB81]/15 text-[#0ECB81]' : e.method === 'POST' ? 'bg-[#F0B90B]/15 text-[#F0B90B]' : 'bg-[#F6465D]/15 text-[#F6465D]'}`}>{e.method}</span>
                <code className="text-sm font-mono text-[#EAECEF] truncate min-w-0 flex-1">{e.path}</code>
                <span className="text-sm text-[#848E9C] hidden md:block truncate min-w-0 flex-1 text-right">{e.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rate limit table */}
      <section className="py-20 bg-[#0d1014] border-t border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl font-bold mb-3">Rate limits & throughput</h2>
          <p className="text-[#848E9C] mb-10 max-w-2xl">Limits scale automatically with your VIP level. Institutional accounts can request bespoke quotas and co-located gateways.</p>
          <div className="overflow-x-auto rounded-lg border border-[#2B3139]">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-[#181A20] text-[#848E9C] text-left">
                  <th className="px-5 py-4 font-medium">Tier</th>
                  <th className="px-5 py-4 font-medium text-right">REST weight / min</th>
                  <th className="px-5 py-4 font-medium text-right">Order rate</th>
                  <th className="px-5 py-4 font-medium text-right">WS streams</th>
                  <th className="px-5 py-4 font-medium text-right">Co-location</th>
                </tr>
              </thead>
              <tbody>
                {RATE_TABLE.map((r, i) => (
                  <tr key={r.tier} className={`border-t border-[#2B3139] ${i % 2 ? 'bg-[#0d1014]' : 'bg-[#0B0E11]'}`}>
                    <td className="px-5 py-4 font-semibold text-[#EAECEF] whitespace-nowrap">{r.tier}</td>
                    <td className="px-5 py-4 text-right tabular-nums whitespace-nowrap text-[#B7BDC6]">{r.weight}</td>
                    <td className="px-5 py-4 text-right tabular-nums whitespace-nowrap text-[#B7BDC6]">{r.orders}</td>
                    <td className="px-5 py-4 text-right tabular-nums whitespace-nowrap text-[#B7BDC6]">{r.ws}</td>
                    <td className="px-5 py-4 text-right whitespace-nowrap text-[#B7BDC6]">{r.co}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SDKs */}
      <section className="py-20 bg-[#0B0E11] border-t border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl font-bold mb-3">Official SDKs</h2>
          <p className="text-[#848E9C] mb-10 max-w-2xl">Open-source connectors maintained by the Basonce engineering team across six languages.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SDKS.map((s) => (
              <div key={s.lang} className="bg-[#181A20] border border-[#2B3139] rounded-lg p-5 hover:border-[#F0B90B]/40 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-[#EAECEF]">{s.lang}</span>
                  <span className="text-xs text-[#848E9C] font-mono whitespace-nowrap">{s.mgr}</span>
                </div>
                <code className="text-sm font-mono text-[#F0B90B] block truncate min-w-0">{s.pkg}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security band */}
      <section className="py-20 bg-[#0d1014] border-t border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6 grid md:grid-cols-3 gap-6">
          {[
            { icon: ShieldCheck, t: 'Granular permissions', d: 'Scope each key to read-only, spot trading, futures or withdrawals. Bind to specific IPs.' },
            { icon: Lock, t: 'Two signature schemes', d: 'Choose classic HMAC-SHA256 or Ed25519 asymmetric keys for stronger non-repudiation.' },
            { icon: Activity, t: 'Live key monitoring', d: 'Usage analytics, anomaly alerts and one-click revocation directly from your dashboard.' },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.t} className="bg-[#181A20] border border-[#2B3139] rounded-lg p-7">
                <div className="w-11 h-11 rounded bg-[#2B3139] flex items-center justify-center text-[#F0B90B] mb-5">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.t}</h3>
                <p className="text-[#848E9C] text-sm leading-relaxed">{f.d}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-28 bg-[#0B0E11] text-center border-t border-[#2B3139]">
        <div className="max-w-[760px] mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold mb-5">Ship your first request in minutes</h2>
          <p className="text-lg text-[#848E9C] mb-9">Generate a key, drop in an SDK and start streaming live markets today.</p>
          <button onClick={openAuthRegister} className="px-9 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-semibold rounded text-lg transition-colors">
            Create API Key
          </button>
        </div>
      </section>
    </div>
  );
}
