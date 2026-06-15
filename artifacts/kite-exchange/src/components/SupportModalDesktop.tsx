import { useState, type RefObject } from 'react';
import {
  X, Send, Check, CheckCheck, ChevronRight, Shield, Clock, Star, Copy,
  MessageCircle, Phone, HelpCircle, Lock, Globe, Headset,
  Wallet, ArrowDownToLine, ShieldCheck, TrendingUp, Cpu,
} from 'lucide-react';
import type { Agent } from '../lib/agent-assignment';
import type { UserContextData } from '../lib/ai-support-engine';
import type { SupportMessage } from './SupportModal';

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        if (!value) return;
        navigator.clipboard?.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      className="w-7 h-7 rounded-lg bg-[#1E2329] hover:bg-[#2B3139] border border-[#2B3139] flex items-center justify-center transition-colors shrink-0"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-[#0ECB81]" /> : <Copy className="w-3.5 h-3.5 text-[#848E9C]" />}
    </button>
  );
}

const DESKTOP_FAQ = [
  { icon: Wallet, q: 'How Do I Deposit Funds?', a: 'Go to Wallet > Deposit, select your preferred network and copy the wallet address. Transactions confirm within 5-30 minutes.' },
  { icon: ArrowDownToLine, q: 'How Long Do Withdrawals Take?', a: 'Withdrawals are processed within 1-24 hours after identity verification. Network fees apply.' },
  { icon: ShieldCheck, q: 'How Do I Secure My Account?', a: 'Enable 2FA in Security Settings, use a strong unique password, and never share your credentials.' },
  { icon: TrendingUp, q: 'What Is Futures Trading?', a: 'Futures trading lets you trade with leverage up to 125x. Always use stop-loss to manage risk.' },
  { icon: Cpu, q: 'How Does Mining Work?', a: 'Purchase mining equipment to earn EQ tokens passively. Higher tier machines yield more rewards.' },
];

const DESKTOP_COUNTRIES = [
  { name: 'United States', count: 112 },
  { name: 'China', count: 76 },
  { name: 'United Kingdom', count: 67 },
  { name: 'Germany', count: 58 },
  { name: 'Japan', count: 51 },
  { name: 'Turkey', count: 45 },
  { name: 'France', count: 44 },
  { name: 'South Korea', count: 41 },
  { name: 'Italy', count: 38 },
  { name: 'UAE', count: 33 },
  { name: 'Saudi Arabia', count: 29 },
  { name: 'Netherlands', count: 22 },
];

const DESKTOP_QUICK_REPLIES = [
  'Deposit issue',
  'Withdrawal problem',
  'Account verification',
  'Transaction issue',
  'Security concern',
];

const AGENT_AVATARS = ['/ber1.jpg', '/ber3.jpg', '/ber5.png'];

const TRUST_ROWS = [
  { icon: Shield, label: 'Bank-grade security', desc: 'End-to-end SSL encryption' },
  { icon: Clock, label: '24/7 availability', desc: 'Every day of the year' },
  { icon: Star, label: '4.9 / 5 satisfaction', desc: 'Across 60k+ rated chats' },
];

export function DesktopHomeScreen({ liveAgentCount, onStartChat, onClose, expandedFaq, setExpandedFaq }: {
  liveAgentCount: number;
  onStartChat: () => void;
  onClose: () => void;
  expandedFaq: number | null;
  setExpandedFaq: (i: number | null) => void;
}) {
  return (
    <div className="flex h-full">
      {/* Brand pane */}
      <aside className="w-[330px] shrink-0 border-r border-[#1E2329] bg-gradient-to-b from-[#0E1217] to-[#0B0E11] flex flex-col p-7">
        <div className="flex items-center gap-2 mb-5">
          <span className="w-2 h-2 rounded-full bg-[#0ECB81] animate-pulse" />
          <span className="text-[#848E9C] text-[11px] font-bold tracking-[0.22em] uppercase">Live Support</span>
        </div>
        <h2 className="text-white text-[27px] leading-[1.15] font-bold tracking-tight">How can we<br />help you?</h2>
        <p className="text-[#848E9C] text-sm leading-relaxed mt-3">
          Our specialists are online around the clock for deposits, withdrawals, trading and account security.
        </p>

        <div className="mt-6 rounded-xl border border-[#1E2329] bg-[#111418] px-4 py-3.5 flex items-center gap-3">
          <div className="flex -space-x-2.5 shrink-0">
            {AGENT_AVATARS.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="w-9 h-9 rounded-full border-2 border-[#0B0E11] object-cover"
                onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=Agent&background=181A20&color=F0B90B&size=64`; }}
              />
            ))}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
              <span className="text-white text-sm font-bold tabular-nums">{liveAgentCount}+ agents online</span>
            </div>
            <p className="text-[#848E9C] text-xs mt-0.5">Avg. response time ~45s</p>
          </div>
        </div>

        <div className="mt-auto pt-6 space-y-3">
          {TRUST_ROWS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#F0B90B]/10 border border-[#F0B90B]/20 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#F0B90B]" />
              </div>
              <div>
                <p className="text-white text-[13px] font-semibold leading-tight">{label}</p>
                <p className="text-[#848E9C] text-[11px]">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Content pane */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-7 pt-6 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F0B90B]/10 border border-[#F0B90B]/20 flex items-center justify-center">
              <Headset className="w-4 h-4 text-[#F0B90B]" />
            </div>
            <h3 className="text-white font-bold text-[15px]">Support Center</h3>
          </div>
          <button onClick={onClose} className="text-[#848E9C] hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-7 pt-4">
          <button
            onClick={onStartChat}
            className="group w-full rounded-xl bg-gradient-to-r from-[#F0B90B] to-[#FCD535] hover:from-[#FCD535] hover:to-[#F0B90B] transition-all px-5 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#0B0E11]/15 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-[#0B0E11]" />
              </div>
              <div className="text-left">
                <p className="text-[#0B0E11] font-bold text-[15px] leading-tight">Chat with a live agent</p>
                <p className="text-[#0B0E11]/70 text-xs font-medium mt-0.5">Connect instantly • no waiting queue</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1.5 bg-[#0B0E11]/15 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B0E11] animate-pulse" />
                <span className="text-[#0B0E11] text-[10px] font-bold tracking-wide">ONLINE</span>
              </span>
              <ChevronRight className="w-5 h-5 text-[#0B0E11] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 px-7 pt-6 pb-3">
          <HelpCircle className="w-4 h-4 text-[#F0B90B]" />
          <h4 className="text-white font-bold text-sm">Frequently asked questions</h4>
        </div>

        <div className="flex-1 overflow-y-auto px-7 pb-6 space-y-2">
          {DESKTOP_FAQ.map((item, i) => (
            <div key={i} className="rounded-xl border border-[#1E2329] bg-[#111418] hover:border-[#2B3139] transition-colors overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1E2329] flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-[#F0B90B]" />
                  </div>
                  <span className="text-white text-sm font-semibold">{item.q}</span>
                </div>
                <ChevronRight className={`w-4 h-4 text-[#848E9C] shrink-0 transition-transform ${expandedFaq === i ? 'rotate-90 text-[#F0B90B]' : ''}`} />
              </button>
              {expandedFaq === i && (
                <div className="px-4 pb-4 border-t border-[#1E2329]">
                  <p className="text-[#B7BDC6] text-[13px] leading-relaxed pt-3">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DesktopFormScreen({ customerId, setCustomerId, email, setEmail, isLoading, agentConnecting, formError, idVerifying, verifiedUser, onBack, onClose, onSubmit }: {
  customerId: string;
  setCustomerId: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  isLoading: boolean;
  agentConnecting: boolean;
  formError: string;
  idVerifying: boolean;
  verifiedUser: UserContextData | null;
  onBack: () => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const profile = verifiedUser?.profile as Record<string, unknown> | undefined;
  const miningSummary = verifiedUser?.mining_summary as Record<string, unknown> | undefined;
  const balances = (verifiedUser?.balances as Array<Record<string, unknown>>) || [];
  const usdtBal = balances.find(b => b.symbol === 'USDT');
  const usdtSpot = usdtBal ? Number(usdtBal.balance) : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex items-center justify-between px-7 py-4 border-b border-[#1E2329] bg-[#0B0E11]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-[#848E9C] hover:text-white transition-colors p-1 -ml-1">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h3 className="text-white font-bold text-sm">Verify your identity</h3>
            <p className="text-[#848E9C] text-xs">Connect securely to support</p>
          </div>
        </div>
        <button onClick={onClose} className="text-[#848E9C] hover:text-white transition-colors p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-7">
        <div className="grid grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            {!verifiedUser && (
              <>
                <div className="rounded-2xl border border-[#1E2329] bg-[#111418] p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative w-10 h-10 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-[#F0B90B]/20 animate-ping" style={{ animationDuration: '2s' }} />
                      <div className="relative w-10 h-10 bg-[#F0B90B]/15 rounded-full border border-[#F0B90B]/40 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-[#F0B90B]" />
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Global support network</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
                        <span className="text-[#0ECB81] text-xs font-semibold">420+ agents online</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {DESKTOP_COUNTRIES.map(c => (
                      <div key={c.name} className="flex items-center justify-between bg-[#0B0E11] rounded-lg border border-[#1E2329] px-3 py-2">
                        <span className="text-[#B7BDC6] text-xs truncate">{c.name}</span>
                        <span className="text-white text-xs font-bold tabular-nums ml-2">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#1E2329] bg-[#111418] p-5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#F0B90B]" />
                    <span className="text-white text-xs font-bold uppercase tracking-wide">Secure verification</span>
                  </div>
                  <p className="text-[#848E9C] text-xs leading-relaxed">
                    Your identity is verified with end-to-end encryption to ensure a private, secure support session.
                  </p>
                </div>
              </>
            )}

            {verifiedUser && profile && (
              <div className="rounded-2xl border border-[#0ECB81]/30 bg-gradient-to-br from-[#111418] to-[#0d1117] p-5 shadow-lg shadow-[#0ECB81]/5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#0ECB81] animate-pulse" />
                  <span className="text-[#0ECB81] text-xs font-black uppercase tracking-widest">Account verified</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#F0B90B]/20 border border-[#F0B90B]/30 flex items-center justify-center shrink-0">
                    <span className="text-[#F0B90B] font-black text-sm">
                      {String(profile.full_name || profile.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm leading-none truncate">{String(profile.full_name || 'User')}</p>
                    <p className="text-[#848E9C] text-xs mt-0.5">ID: {String(profile.user_id)} · VIP {String(profile.user_level || 1)}</p>
                  </div>
                  <div className="ml-auto text-right shrink-0">
                    <p className="text-[#F0B90B] font-black text-sm">${usdtSpot.toFixed(2)}</p>
                    <p className="text-[#848E9C] text-[10px]">USDT Balance</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#0B0E11] rounded-xl p-2.5 text-center border border-[#1E2329]">
                    <p className="text-white font-bold text-xs">{String(profile.total_trades || 0)}</p>
                    <p className="text-[#848E9C] text-[9px] mt-0.5">Total Trades</p>
                  </div>
                  <div className="bg-[#0B0E11] rounded-xl p-2.5 text-center border border-[#1E2329]">
                    <p className="text-white font-bold text-xs">{String(miningSummary?.total_equipment || 0)}</p>
                    <p className="text-[#848E9C] text-[9px] mt-0.5">Mining Equip.</p>
                  </div>
                  <div className="bg-[#0B0E11] rounded-xl p-2.5 text-center border border-[#1E2329]">
                    <p className="text-white font-bold text-xs capitalize">{String(profile.verification_status || 'unverified').slice(0, 8)}</p>
                    <p className="text-[#848E9C] text-[9px] mt-0.5">KYC Status</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right column — form */}
          <div className="flex flex-col">
            <div className="space-y-4">
              <div>
                <label className="block text-[#848E9C] text-[10px] font-bold mb-2 uppercase tracking-[0.15em]">Customer ID</label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerId}
                    onChange={e => setCustomerId(e.target.value)}
                    placeholder="e.g. 255612"
                    className={`w-full bg-[#111418] border text-white rounded-xl px-4 py-3.5 text-sm outline-none transition-colors placeholder-gray-600 pr-20 ${
                      verifiedUser ? 'border-[#0ECB81]/50 focus:border-[#0ECB81]' : 'border-[#1E2329] focus:border-[#F0B90B]'
                    }`}
                    onKeyPress={e => e.key === 'Enter' && onSubmit()}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {idVerifying && (
                      <div className="w-4 h-4 border-2 border-[#F0B90B]/30 border-t-[#F0B90B] rounded-full animate-spin" />
                    )}
                    {!idVerifying && verifiedUser && (
                      <div className="w-5 h-5 bg-[#0ECB81]/20 rounded-full flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-[#0ECB81]" />
                      </div>
                    )}
                    {customerId.trim() && <CopyButton value={customerId} label="Customer ID" />}
                  </div>
                </div>
                {!idVerifying && customerId.trim().length >= 3 && !verifiedUser && (
                  <p className="text-[#848E9C] text-[10px] mt-1.5 pl-1">Enter your numeric platform ID (found in Profile)</p>
                )}
              </div>
              <div>
                <label className="block text-[#848E9C] text-[10px] font-bold mb-2 uppercase tracking-[0.15em]">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-[#111418] border border-[#1E2329] focus:border-[#F0B90B] text-white rounded-xl px-4 py-3.5 text-sm outline-none transition-colors placeholder-gray-600 pr-12"
                    onKeyPress={e => e.key === 'Enter' && onSubmit()}
                  />
                  {email.trim() && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <CopyButton value={email} label="email" />
                    </div>
                  )}
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                  <p className="text-red-400 text-xs">{formError}</p>
                </div>
              )}

              <button
                onClick={onSubmit}
                disabled={isLoading || agentConnecting || !customerId.trim() || !email.trim()}
                className="w-full bg-[#F0B90B] hover:bg-[#d4a200] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0E11] font-black rounded-xl py-4 text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#F0B90B]/20"
              >
                {agentConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#0B0E11]/30 border-t-[#0B0E11] rounded-full animate-spin" />
                    Connecting to agent...
                  </>
                ) : isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#0B0E11]/30 border-t-[#0B0E11] rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Headset className="w-4 h-4" />
                    Start live chat
                  </>
                )}
              </button>

              <p className="text-[#848E9C] text-[10px] text-center pt-1">By continuing, you agree to our Terms of Service</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DesktopChatScreen({ agent, messages, newMessage, setNewMessage, isAgentTyping, ticketId, customerId, inputRef, messagesEndRef, onSend, onClose }: {
  agent: Agent;
  messages: SupportMessage[];
  newMessage: string;
  setNewMessage: (v: string) => void;
  isAgentTyping: boolean;
  ticketId: string | null;
  customerId: string;
  inputRef: RefObject<HTMLInputElement>;
  messagesEndRef: RefObject<HTMLDivElement>;
  onSend: (text?: string) => void;
  onClose: () => void;
}) {
  const showQuickReplies = messages.filter(m => m.sender_type === 'customer').length === 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim()) onSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 bg-[#0B0E11] border-b border-[#1E2329]">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <img
                src={agent.avatar_url}
                alt={agent.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-[#F0B90B]/30"
                onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=F0B90B&color=181A20&size=128&bold=true`; }}
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#0ECB81] rounded-full border-2 border-[#0B0E11]" />
            </div>
            <div>
              <span className="text-white font-bold text-sm leading-none">{agent.name}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 bg-[#0ECB81] rounded-full animate-pulse" />
                <span className="text-[#0ECB81] text-xs font-medium">Online</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#848E9C] hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 bg-[#0B0E11]">
        <div className="max-w-[680px] mx-auto space-y-3">
          {messages.length === 0 && !isAgentTyping && (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 bg-[#F0B90B]/10 rounded-2xl flex items-center justify-center mb-4 border border-[#F0B90B]/20">
                <Phone className="w-7 h-7 text-[#F0B90B]" />
              </div>
              <p className="text-white font-semibold text-sm mb-1">{agent.name} connected</p>
              <p className="text-[#848E9C] text-xs mb-5">Type a message to get started</p>
              {showQuickReplies && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {DESKTOP_QUICK_REPLIES.map(reply => (
                    <button
                      key={reply}
                      onClick={() => onSend(reply)}
                      className="bg-[#1E2329] hover:bg-[#252930] border border-[#2B3139] hover:border-[#F0B90B]/30 text-[#B7BDC6] hover:text-white text-xs rounded-full px-3 py-1.5 transition-all"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender_type !== 'customer' && (
                <img
                  src={agent.avatar_url}
                  alt={agent.name}
                  className="w-7 h-7 rounded-full object-cover mr-2 flex-shrink-0 self-end mb-1 border border-[#2B3139]"
                  onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=F0B90B&color=181A20&size=64&bold=true`; }}
                />
              )}
              <div className="max-w-[60%]">
                <div className={`rounded-2xl px-4 py-2.5 ${msg.sender_type === 'customer' ? 'bg-[#F0B90B] text-[#0B0E11] rounded-br-sm' : 'bg-[#1E2329] text-white rounded-bl-sm'}`}>
                  <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                </div>
                <div className={`flex items-center gap-1 mt-1 ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[#5E6673] text-[10px]">
                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.sender_type === 'customer' && (
                    msg.read ? <CheckCheck className="w-3 h-3 text-[#F0B90B]" /> : <Check className="w-3 h-3 text-[#5E6673]" />
                  )}
                </div>
              </div>
            </div>
          ))}

          {isAgentTyping && (
            <div className="flex justify-start items-end gap-2">
              <img
                src={agent.avatar_url}
                alt={agent.name}
                className="w-7 h-7 rounded-full object-cover border border-[#2B3139] flex-shrink-0"
                onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=F0B90B&color=181A20&size=64&bold=true`; }}
              />
              <div className="bg-[#1E2329] rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-[#848E9C] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-[#848E9C] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-[#848E9C] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex-shrink-0 bg-[#0B0E11] border-t border-[#1E2329] px-6 py-4">
        <div className="max-w-[680px] mx-auto">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="flex-1 bg-[#1E2329] border border-[#2B3139] focus:border-[#F0B90B] text-white placeholder-gray-600 px-4 py-3 rounded-2xl text-sm outline-none transition-colors"
              autoComplete="off"
            />
            <button
              onClick={() => { if (newMessage.trim()) onSend(); }}
              disabled={!newMessage.trim()}
              className="w-11 h-11 bg-[#F0B90B] hover:bg-[#d4a200] disabled:opacity-40 disabled:cursor-not-allowed text-[#0B0E11] rounded-2xl transition-all flex items-center justify-center flex-shrink-0 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {ticketId && (
            <p className="text-[#5E6673] text-[10px] mt-2 text-center">
              Ticket #{ticketId.slice(0, 8).toUpperCase()} · {customerId}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
