import { useState } from 'react';
import {
  MessageSquare,
  Mail,
  Phone,
  Clock,
  Globe,
  ShieldCheck,
  Headset,
  ArrowRight,
  Send,
  CheckCheck,
} from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

const CHAT = [
  { from: 'agent', name: 'Basonce Support', text: 'Hi, welcome to Basonce live support. My name is Aria. How can I help you today?' },
  { from: 'user', text: 'My USDT deposit on TRC20 is still pending after 20 minutes.' },
  { from: 'agent', name: 'Aria', text: 'Thanks for the details. I can see the network is currently confirming. TRC20 deposits credit after 1 network confirmation — usually under 3 minutes.' },
  { from: 'user', text: 'It shows 0/1 confirmations.' },
  { from: 'agent', name: 'Aria', text: 'No problem. Could you share the transaction hash (TxID)? I will check it on-chain for you right away.' },
];

const CHANNELS = [
  {
    icon: MessageSquare,
    name: 'Live Chat',
    tag: 'Fastest',
    desc: 'Instant messaging with a support specialist, available around the clock for urgent account and trading issues.',
    detail: 'Avg. wait < 30s',
    accent: true,
  },
  {
    icon: Mail,
    name: 'Email Support',
    tag: '24/7',
    desc: 'Open a detailed ticket with attachments for complex cases that require investigation by a senior agent.',
    detail: 'Reply < 4 hours',
    accent: false,
  },
  {
    icon: Phone,
    name: 'Phone Callback',
    tag: 'VIP',
    desc: 'Priority voice support for verified VIP and institutional clients, with a dedicated relationship manager.',
    detail: 'Scheduled callbacks',
    accent: false,
  },
];

const STATS = [
  { icon: Clock, value: '< 30s', label: 'Avg. chat response' },
  { icon: Headset, value: '24/7/365', label: 'Always online' },
  { icon: Globe, value: '17', label: 'Languages supported' },
  { icon: ShieldCheck, value: '98.6%', label: 'Satisfaction rate' },
];

const LANGS = ['English', 'Español', 'Português', '中文', '日本語', '한국어', 'Français', 'Deutsch', 'Türkçe', 'Русский', 'العربية', 'Bahasa', 'Tiếng Việt', 'हिन्दी'];

export default function ChatSupportPage({ onNavigate }: MorePageProps) {
  const [draft, setDraft] = useState('');

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans pb-24">
      {/* Split hero with chat preview */}
      <section className="border-b border-[#2B3139] bg-[#181A20]">
        <div className="max-w-[1200px] mx-auto px-6 py-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0ECB81]/10 border border-[#0ECB81]/30 text-xs text-[#0ECB81] mb-6 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-[#0ECB81] animate-pulse" /> Agents online now
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight mb-5">
              24/7 live <span className="text-[#F0B90B]">support</span>, whenever you need it
            </h1>
            <p className="text-[#848E9C] text-lg leading-relaxed mb-8">
              Real human specialists, not bots-only scripts. Get help with deposits, withdrawals, trading and security in seconds — in your language, any time of day.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('home')}
                className="px-7 py-3.5 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> Start Live Chat
              </button>
              <button
                onClick={openAuthRegister}
                className="px-7 py-3.5 bg-transparent border border-[#2B3139] hover:bg-[#2B3139] text-white font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                Create Account <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mock chat window */}
          <div className="bg-[#0B0E11] border border-[#2B3139] rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#1E2329] border-b border-[#2B3139]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F0B90B]/15 flex items-center justify-center">
                  <Headset className="w-4 h-4 text-[#F0B90B]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white leading-tight">Basonce Support</div>
                  <div className="text-xs text-[#0ECB81] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81]" /> Online
                  </div>
                </div>
              </div>
              <span className="text-xs text-[#848E9C] tabular-nums whitespace-nowrap">#BSC-49217</span>
            </div>
            <div className="p-5 space-y-4 h-[340px] overflow-hidden bg-[#0d1014]">
              {CHAT.map((m, i) => (
                <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.from === 'user'
                      ? 'bg-[#F0B90B] text-black rounded-br-sm'
                      : 'bg-[#1E2329] text-[#EAECEF] rounded-bl-sm border border-[#2B3139]'
                  }`}>
                    {m.text}
                    {m.from === 'user' && (
                      <CheckCheck className="inline-block w-3.5 h-3.5 ml-1 -mt-0.5 text-black/60" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-t border-[#2B3139] bg-[#1E2329]">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your message…"
                className="flex-1 min-w-0 bg-[#0B0E11] border border-[#2B3139] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#5E6673] focus:outline-none focus:border-[#F0B90B] transition-colors"
              />
              <button className="w-10 h-10 shrink-0 rounded-lg bg-[#F0B90B] hover:bg-[#FCD535] text-black flex items-center justify-center transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-b border-[#2B3139] bg-[#0B0E11]">
        <div className="max-w-[1100px] mx-auto px-6 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex flex-col items-center text-center">
                <Icon className="w-6 h-6 text-[#F0B90B] mb-3" />
                <div className="text-2xl lg:text-3xl font-bold text-white tabular-nums whitespace-nowrap mb-1">{s.value}</div>
                <div className="text-xs font-semibold text-[#848E9C] uppercase tracking-widest">{s.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Channels */}
      <section className="max-w-[1200px] mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white mb-3">Choose how you'd like to reach us</h2>
          <p className="text-[#848E9C]">Every channel connects you to a trained Basonce specialist.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.name}
                className={`rounded-xl p-7 border transition-colors ${
                  c.accent
                    ? 'bg-[#181A20] border-[#F0B90B]/40'
                    : 'bg-[#181A20] border-[#2B3139] hover:border-[#F0B90B]/30'
                }`}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-lg bg-[#1E2329] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#F0B90B]" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#F0B90B]/10 text-[#F0B90B] whitespace-nowrap uppercase tracking-wide">
                    {c.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{c.name}</h3>
                <p className="text-sm text-[#848E9C] leading-relaxed mb-5 min-w-0">{c.desc}</p>
                <div className="flex items-center gap-2 text-sm text-[#0ECB81] font-semibold whitespace-nowrap">
                  <Clock className="w-4 h-4" /> {c.detail}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Multilingual */}
      <section className="bg-[#181A20] border-y border-[#2B3139] py-16">
        <div className="max-w-[1000px] mx-auto px-6 text-center">
          <Globe className="w-8 h-8 text-[#F0B90B] mx-auto mb-5" />
          <h2 className="text-2xl font-bold text-white mb-3">Support in your language</h2>
          <p className="text-[#848E9C] max-w-2xl mx-auto mb-8">
            Our global team provides native-language assistance across 17 languages, ensuring nothing gets lost in translation.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {LANGS.map((l) => (
              <span
                key={l}
                className="px-4 py-2 rounded-full bg-[#0B0E11] border border-[#2B3139] text-sm text-[#B7BDC6] whitespace-nowrap"
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-[900px] mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">We're here whenever you need us</h2>
        <p className="text-[#848E9C] mb-8 max-w-xl mx-auto">
          Day or night, weekday or weekend — a real specialist is ready to help you trade with confidence.
        </p>
        <button
          onClick={() => onNavigate('home')}
          className="px-8 py-3.5 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors inline-flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" /> Talk to Support Now
        </button>
      </section>
    </div>
  );
}
