import { useState } from 'react';
import {
  Ticket,
  CheckCircle2,
  Paperclip,
  Info,
  Clock,
  AlertTriangle,
  Mail,
  ShieldCheck,
  ListChecks,
} from 'lucide-react';
import type { MorePageProps } from './types';

const CATEGORIES = [
  'Account & Login',
  'Deposit Issue',
  'Withdrawal Issue',
  'Trading & Orders',
  'Identity Verification (KYC)',
  'Security & Fraud',
  'API & Developers',
  'Other',
];

const PRIORITIES = [
  { key: 'low', label: 'Low', desc: 'General question', color: '#848E9C' },
  { key: 'normal', label: 'Normal', desc: 'Standard issue', color: '#F0B90B' },
  { key: 'high', label: 'High', desc: 'Funds affected', color: '#F6465D' },
];

const TIPS = [
  'Your registered email and account UID (never share your password).',
  'The transaction ID (TxID) or order number related to the issue.',
  'The exact amount, asset and network involved.',
  'Screenshots of any error messages you received.',
  'A clear timeline of when the issue started.',
];

const SLA = [
  { icon: Clock, label: 'First response', value: 'Within 4 hours' },
  { icon: ShieldCheck, label: 'Resolution target', value: '1–3 business days' },
  { icon: Mail, label: 'Updates via', value: 'Email + Inbox' },
];

export default function SubmitRequestPage({ onNavigate }: MorePageProps) {
  void onNavigate;
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [submitted, setSubmitted] = useState(false);
  const [ticketId] = useState(() => 'BSC-' + Math.floor(100000 + Math.random() * 899999));

  const valid = category && subject.trim() && email.trim() && description.trim().length >= 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitted(true);
  };

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans pb-24">
      {/* Hero */}
      <section className="bg-[#181A20] border-b border-[#2B3139]">
        <div className="max-w-[1100px] mx-auto px-6 py-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E2329] border border-[#2B3139] text-xs text-[#848E9C] mb-5 uppercase tracking-widest">
            <Ticket className="w-3.5 h-3.5 text-[#F0B90B]" /> Support Ticket
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">Submit a request</h1>
          <p className="text-[#848E9C] text-lg max-w-2xl leading-relaxed">
            Can't find your answer in the Help Center? Open a ticket and our support specialists will investigate and reply by email.
          </p>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-6 py-16 grid lg:grid-cols-3 gap-10">
        {/* Form / success */}
        <div className="lg:col-span-2">
          {submitted ? (
            <div className="bg-[#181A20] border border-[#0ECB81]/40 rounded-2xl p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-[#0ECB81]/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-[#0ECB81]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Your request has been submitted</h2>
              <p className="text-[#848E9C] max-w-md mx-auto mb-6">
                Thanks for reaching out. A confirmation has been sent to <span className="text-[#EAECEF] font-medium">{email}</span>. Our team will respond within 4 hours.
              </p>
              <div className="inline-flex items-center gap-3 bg-[#0B0E11] border border-[#2B3139] rounded-lg px-5 py-3 mb-8">
                <span className="text-xs text-[#848E9C] uppercase tracking-widest">Ticket ID</span>
                <span className="text-lg font-bold text-[#F0B90B] tabular-nums whitespace-nowrap">{ticketId}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto">
                <div className="bg-[#0B0E11] border border-[#2B3139] rounded-lg p-4">
                  <div className="text-xs text-[#848E9C] uppercase tracking-wide mb-1">Category</div>
                  <div className="text-sm font-medium text-white truncate">{category}</div>
                </div>
                <div className="bg-[#0B0E11] border border-[#2B3139] rounded-lg p-4">
                  <div className="text-xs text-[#848E9C] uppercase tracking-wide mb-1">Priority</div>
                  <div className="text-sm font-medium text-white capitalize">{priority}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setCategory('');
                  setSubject('');
                  setEmail('');
                  setDescription('');
                  setPriority('normal');
                }}
                className="mt-8 px-6 py-2.5 bg-transparent border border-[#2B3139] hover:bg-[#2B3139] text-white font-semibold rounded-lg transition-colors"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-8 space-y-6">
              <div>
                <label className="block text-xs font-semibold text-[#B7BDC6] uppercase tracking-wider mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F0B90B] transition-colors appearance-none"
                >
                  <option value="">Select a category…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-[#B7BDC6] uppercase tracking-wider mb-2">Registered email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg px-4 py-3 text-white placeholder-[#5E6673] focus:outline-none focus:border-[#F0B90B] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#B7BDC6] uppercase tracking-wider mb-2">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of the issue"
                    className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg px-4 py-3 text-white placeholder-[#5E6673] focus:outline-none focus:border-[#F0B90B] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B7BDC6] uppercase tracking-wider mb-2">Priority</label>
                <div className="grid grid-cols-3 gap-3">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPriority(p.key)}
                      className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                        priority === p.key
                          ? 'border-[#F0B90B] bg-[#F0B90B]/5'
                          : 'border-[#2B3139] bg-[#0B0E11] hover:border-[#5E6673]'
                      }`}
                    >
                      <div className="text-sm font-bold" style={{ color: p.color }}>{p.label}</div>
                      <div className="text-xs text-[#848E9C] mt-0.5 truncate">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B7BDC6] uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder="Describe your issue in detail, including transaction IDs, amounts and timestamps where relevant…"
                  className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg px-4 py-3 text-white placeholder-[#5E6673] focus:outline-none focus:border-[#F0B90B] transition-colors resize-none"
                />
                <p className="text-xs text-[#5E6673] mt-2">Minimum 10 characters. Do not share your password or 2FA codes.</p>
              </div>

              <div className="flex items-center gap-2 text-sm text-[#848E9C] border border-dashed border-[#2B3139] rounded-lg px-4 py-3">
                <Paperclip className="w-4 h-4 shrink-0" />
                <span>Attach screenshots (PNG, JPG up to 10MB) — optional</span>
              </div>

              <button
                type="submit"
                disabled={!valid}
                className={`w-full py-3.5 rounded-lg font-bold transition-colors ${
                  valid
                    ? 'bg-[#F0B90B] hover:bg-[#FCD535] text-black'
                    : 'bg-[#2B3139] text-[#5E6673] cursor-not-allowed'
                }`}
              >
                Submit Request
              </button>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <ListChecks className="w-5 h-5 text-[#F0B90B]" />
              <h3 className="font-bold text-white">What to include</h3>
            </div>
            <ul className="space-y-3">
              {TIPS.map((t) => (
                <li key={t} className="flex gap-2.5 text-sm text-[#B7BDC6] leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-[#0ECB81] shrink-0 mt-0.5" />
                  <span className="min-w-0">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[#F0B90B]" />
              <h3 className="font-bold text-white">SLA expectations</h3>
            </div>
            <div className="space-y-4">
              {SLA.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#1E2329] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[#848E9C]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-[#848E9C] uppercase tracking-wide">{s.label}</div>
                      <div className="text-sm font-semibold text-white truncate">{s.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#F6465D]/5 border border-[#F6465D]/30 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-[#F6465D]" />
              <h3 className="font-bold text-white">Beware of scams</h3>
            </div>
            <p className="text-sm text-[#B7BDC6] leading-relaxed">
              Basonce staff will never ask for your password, 2FA codes or seed phrase. We will never request remote access to your device.
            </p>
          </div>

          <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-[#F0B90B]" />
              <h3 className="font-bold text-white">Need it faster?</h3>
            </div>
            <p className="text-sm text-[#848E9C] leading-relaxed">
              For urgent issues affecting your funds, use 24/7 live chat for an immediate response from a specialist.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
