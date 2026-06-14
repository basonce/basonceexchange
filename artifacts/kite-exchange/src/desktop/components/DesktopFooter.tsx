import { useState } from 'react';
import {
  X, Send, Twitter, Facebook, Instagram, Youtube, Linkedin, MessageCircle, Github,
  ShieldCheck, FileCheck, Lock, Headset, Globe, ArrowUpRight, ArrowRight,
  Users, TrendingUp, Coins, QrCode, Smartphone, Mail, CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';
import { LANGUAGES, type TKey } from '../i18n/translations';
import type { DeskTab } from './DesktopNav';

type LinkAction =
  | { type: 'nav'; tab: DeskTab }
  | { type: 'coin'; symbol: string }
  | { type: 'info'; bodyKey: TKey };

interface FooterLink { key: TKey; action: LinkAction }

const COLUMNS: { title: TKey; links: FooterLink[] }[] = [
  {
    title: 'colAbout',
    links: [
      { key: 'about', action: { type: 'nav', tab: 'about' } },
      { key: 'careers', action: { type: 'nav', tab: 'careers' } },
      { key: 'announcements', action: { type: 'nav', tab: 'announcements' } },
      { key: 'news', action: { type: 'nav', tab: 'news' } },
      { key: 'press', action: { type: 'nav', tab: 'press' } },
      { key: 'community', action: { type: 'nav', tab: 'community' } },
    ],
  },
  {
    title: 'colProducts',
    links: [
      { key: 'spot', action: { type: 'nav', tab: 'trade' } },
      { key: 'futures', action: { type: 'nav', tab: 'futures' } },
      { key: 'mining', action: { type: 'nav', tab: 'mining' } },
      { key: 'aiTradingBot', action: { type: 'nav', tab: 'aibot' } },
      { key: 'sports', action: { type: 'nav', tab: 'sports' } },
      { key: 'buyCrypto', action: { type: 'nav', tab: 'markets' } },
    ],
  },
  {
    title: 'colService',
    links: [
      { key: 'affiliate', action: { type: 'nav', tab: 'affiliate' } },
      { key: 'referral', action: { type: 'nav', tab: 'referral' } },
      { key: 'api', action: { type: 'nav', tab: 'api' } },
      { key: 'fees', action: { type: 'nav', tab: 'fees' } },
      { key: 'tradingRules', action: { type: 'nav', tab: 'tradingrules' } },
      { key: 'status', action: { type: 'info', bodyKey: 'statusOk' } },
    ],
  },
  {
    title: 'colSupport',
    links: [
      { key: 'helpCenter', action: { type: 'nav', tab: 'helpcenter' } },
      { key: 'chatSupport', action: { type: 'nav', tab: 'chatsupport' } },
      { key: 'submitRequest', action: { type: 'nav', tab: 'submitrequest' } },
      { key: 'lawEnforcement', action: { type: 'nav', tab: 'lawenforcement' } },
      { key: 'notices', action: { type: 'nav', tab: 'notices' } },
    ],
  },
  {
    title: 'colLearn',
    links: [
      { key: 'buyBitcoin', action: { type: 'coin', symbol: 'BTC' } },
      { key: 'buyEthereum', action: { type: 'coin', symbol: 'ETH' } },
      { key: 'cryptoGlossary', action: { type: 'nav', tab: 'glossary' } },
      { key: 'tradingGuide', action: { type: 'nav', tab: 'guide' } },
      { key: 'marketsOverview', action: { type: 'nav', tab: 'markets' } },
    ],
  },
];

const BOTTOM: FooterLink[] = [
  { key: 'terms', action: { type: 'nav', tab: 'terms' } },
  { key: 'privacy', action: { type: 'nav', tab: 'privacy' } },
  { key: 'cookies', action: { type: 'nav', tab: 'cookies' } },
  { key: 'riskWarning', action: { type: 'nav', tab: 'riskwarning' } },
];

const SOCIALS: { Icon: LucideIcon; label: string }[] = [
  { Icon: Send, label: 'Telegram' },
  { Icon: Twitter, label: 'Twitter' },
  { Icon: Facebook, label: 'Facebook' },
  { Icon: Instagram, label: 'Instagram' },
  { Icon: Youtube, label: 'YouTube' },
  { Icon: Linkedin, label: 'LinkedIn' },
  { Icon: MessageCircle, label: 'Discord' },
  { Icon: Github, label: 'GitHub' },
];

const TRUST: { Icon: LucideIcon; title: TKey; sub: TKey }[] = [
  { Icon: ShieldCheck, title: 'secTitle', sub: 'secSub' },
  { Icon: FileCheck, title: 'porTitle', sub: 'porSub' },
  { Icon: Lock, title: 'safuTitle', sub: 'safuSub' },
  { Icon: Headset, title: 'supTitle', sub: 'supSub' },
];

const STATS: { Icon: LucideIcon; value: string; label: TKey }[] = [
  { Icon: Users, value: '103M+', label: 'statUsersLabel' },
  { Icon: TrendingUp, value: '$76B', label: 'statVolumeLabel' },
  { Icon: Coins, value: '350+', label: 'statCoinsLabel' },
  { Icon: Globe, value: '100+', label: 'statCountriesLabel' },
];

const POPULAR: { name: string; symbol: string }[] = [
  { name: 'Bitcoin', symbol: 'BTC' }, { name: 'Ethereum', symbol: 'ETH' },
  { name: 'BNB', symbol: 'BNB' }, { name: 'Solana', symbol: 'SOL' },
  { name: 'XRP', symbol: 'XRP' }, { name: 'Cardano', symbol: 'ADA' },
  { name: 'Dogecoin', symbol: 'DOGE' }, { name: 'Toncoin', symbol: 'TON' },
  { name: 'Tron', symbol: 'TRX' }, { name: 'Chainlink', symbol: 'LINK' },
  { name: 'Avalanche', symbol: 'AVAX' }, { name: 'Polkadot', symbol: 'DOT' },
  { name: 'Polygon', symbol: 'MATIC' }, { name: 'Litecoin', symbol: 'LTC' },
  { name: 'Shiba Inu', symbol: 'SHIB' }, { name: 'Bitcoin Cash', symbol: 'BCH' },
];

interface Props { onNavigate: (tab: DeskTab) => void }

export default function DesktopFooter({ onNavigate }: Props) {
  const { t, lang } = useLang();
  const [modal, setModal] = useState<{ titleKey: TKey; bodyKey: TKey } | null>(null);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [appHint, setAppHint] = useState(false);

  const goTo = (tab: DeskTab) => { onNavigate(tab); window.scrollTo({ top: 0 }); };

  const native = LANGUAGES.find((l) => l.code === lang)?.native ?? 'English';

  const buyCoin = (symbol: string) => {
    localStorage.setItem('selectedCoinSymbol', symbol);
    window.dispatchEvent(new CustomEvent('desk-select-coin', { detail: symbol }));
    onNavigate('trade');
    window.scrollTo({ top: 0 });
  };

  const handle = (link: FooterLink) => {
    const a = link.action;
    if (a.type === 'nav') { onNavigate(a.tab); window.scrollTo({ top: 0 }); }
    else if (a.type === 'coin') buyCoin(a.symbol);
    else setModal({ titleKey: link.key, bodyKey: a.bodyKey });
  };

  return (
    <footer className="relative bg-[#181A20] border-t border-[#2B3139] mt-12 overflow-hidden">
      {/* top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F0B90B]/60 to-transparent" />
      {/* soft corner glows */}
      <div className="pointer-events-none absolute -left-40 -top-32 h-80 w-80 rounded-full bg-[#F0B90B]/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-80 w-80 rounded-full bg-[#F0B90B]/[0.05] blur-3xl" />

      <div className="relative max-w-[1600px] mx-auto px-6 pt-14 pb-24">
        {/* Newsletter / CTA band */}
        <div className="relative overflow-hidden rounded-2xl border border-[#2B3139] bg-gradient-to-r from-[#1E2329] via-[#1B1E25] to-[#181A20] px-6 py-7 md:px-10 md:py-8 mb-12">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[#F0B90B]/10 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <span className="hidden sm:flex shrink-0 h-12 w-12 items-center justify-center rounded-xl bg-[#0B0E11] text-[#F0B90B] ring-1 ring-[#2B3139]">
                <Mail className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[#EAECEF] text-xl font-bold leading-tight">{t('newsletterTitle')}</h3>
                <p className="text-[#848E9C] text-sm mt-1.5 max-w-xl">{t('newsletterDesc')}</p>
              </div>
            </div>
            <div className="flex w-full max-w-md lg:w-auto items-center gap-2.5 shrink-0">
              <div className="relative flex-1 lg:w-72">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5E6673]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="w-full min-w-0 rounded-lg border border-[#2B3139] bg-[#0B0E11] pl-9 pr-3 py-2.5 text-sm text-[#EAECEF] placeholder:text-[#5E6673] outline-none transition-colors focus:border-[#F0B90B]/60"
                />
              </div>
              <button
                onClick={() => { if (email.trim()) { setSubscribed(true); setEmail(''); } }}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#F0B90B] hover:bg-[#FCD535] px-5 py-2.5 text-sm font-semibold text-black transition-colors whitespace-nowrap cursor-pointer"
              >
                {t('subscribe')} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          {subscribed && (
            <div className="relative mt-4 inline-flex items-center gap-2 rounded-lg border border-[#0ECB81]/40 bg-[#0ECB81]/10 px-3.5 py-2 text-[#0ECB81] text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>You're subscribed. Market insights and product updates are on their way.</span>
            </div>
          )}
        </div>

        {/* Stats credibility bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-[#2B3139] bg-[#2B3139] mb-12">
          {STATS.map((s) => (
            <div key={s.label} className="group bg-[#181A20] px-5 py-6 transition-colors hover:bg-[#1E2329]">
              <div className="flex items-center gap-2 text-[#848E9C] mb-2">
                <s.Icon className="h-4 w-4 text-[#F0B90B]" />
                <span className="text-xs uppercase tracking-wider truncate">{t(s.label)}</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-[#EAECEF] whitespace-nowrap tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Trust / credibility strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {TRUST.map((item) => (
            <div
              key={item.title}
              className="group flex items-start gap-3.5 rounded-xl border border-[#2B3139] bg-[#1E2329] px-4 py-4 transition-all duration-200 hover:border-[#F0B90B]/40 hover:bg-[#23262E]"
            >
              <span className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B0E11] text-[#F0B90B] ring-1 ring-[#2B3139] transition-colors group-hover:ring-[#F0B90B]/40">
                <item.Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[#EAECEF] text-sm font-semibold leading-tight">{t(item.title)}</p>
                <p className="text-[#848E9C] text-xs mt-1 leading-snug">{t(item.sub)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Brand + link columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand block */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="h-9 w-9 flex items-center justify-center overflow-hidden shrink-0">
                <img src="/basonce_logo_son_biten.png" alt="Basonce" className="w-[175%] max-w-none mix-blend-lighten" />
              </span>
              <span className="text-[#EAECEF] font-semibold text-lg tracking-[0.2em]">BASONCE</span>
            </div>
            <p className="text-[#848E9C] text-sm leading-relaxed max-w-xs">{t('footerDesc')}</p>

            <p className="text-[#EAECEF] text-xs font-semibold uppercase tracking-wider mt-7 mb-3">{t('community')}</p>
            <div className="flex flex-wrap gap-2">
              {SOCIALS.map((s) => (
                <button
                  key={s.label}
                  aria-label={s.label}
                  title={s.label}
                  onClick={() => goTo('community')}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2B3139] bg-[#0B0E11] text-[#848E9C] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F0B90B]/50 hover:text-[#F0B90B] hover:bg-[#1E2329] cursor-pointer"
                >
                  <s.Icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            {/* service status */}
            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#2B3139] bg-[#0B0E11] px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0ECB81] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0ECB81]" />
              </span>
              <span className="text-[#B7BDC6] text-xs whitespace-nowrap">{t('systemStatus')}</span>
            </div>
          </div>

          {/* Columns */}
          <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-9">
            {COLUMNS.map((col) => (
              <div key={col.title} className="min-w-0">
                <h4 className="text-[#EAECEF] font-semibold text-sm mb-4">{t(col.title)}</h4>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <li key={l.key}>
                      <button
                        onClick={() => handle(l)}
                        className="group/link inline-flex items-center gap-1 text-[#848E9C] hover:text-[#F0B90B] text-sm cursor-pointer transition-colors text-left"
                      >
                        <span className="truncate">{t(l.key)}</span>
                        <ArrowUpRight className="h-3 w-3 shrink-0 opacity-0 -translate-x-1 transition-all duration-200 group-hover/link:opacity-100 group-hover/link:translate-x-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* App download + Popular coins */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-12">
          {/* App download card */}
          <div className="lg:col-span-4 rounded-2xl border border-[#2B3139] bg-[#1E2329] p-6">
            <div className="flex items-center gap-4">
              <div className="shrink-0 rounded-xl bg-white p-2.5">
                <QrCode className="h-20 w-20 text-[#0B0E11]" strokeWidth={1.25} />
              </div>
              <div className="min-w-0">
                <p className="text-[#F0B90B] text-xs font-semibold uppercase tracking-wider mb-1">{t('scanToDownload')}</p>
                <h4 className="text-[#EAECEF] text-base font-bold leading-tight">{t('appTitle')}</h4>
                <p className="text-[#848E9C] text-xs mt-1.5 leading-snug">{t('appDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mt-5">
              {['App Store', 'Google Play'].map((store) => (
                <button
                  key={store}
                  onClick={() => setAppHint(true)}
                  className="group flex items-center justify-center gap-2 rounded-lg border border-[#2B3139] bg-[#0B0E11] px-3 py-2.5 text-[#EAECEF] transition-all duration-200 hover:border-[#F0B90B]/50 hover:bg-[#23262E] cursor-pointer"
                >
                  <Smartphone className="h-4 w-4 shrink-0 text-[#848E9C] group-hover:text-[#F0B90B] transition-colors" />
                  <span className="text-xs font-medium truncate">{store}</span>
                </button>
              ))}
            </div>
            {appHint && (
              <p className="mt-3 text-xs text-[#0ECB81] leading-snug">Scan the QR code above to install Basonce on iOS and Android.</p>
            )}
          </div>

          {/* Popular cryptocurrencies */}
          <div className="lg:col-span-8 rounded-2xl border border-[#2B3139] bg-[#1E2329] p-6">
            <div className="flex items-start gap-2.5 mb-4">
              <Coins className="h-5 w-5 shrink-0 text-[#F0B90B] mt-0.5" />
              <div className="min-w-0">
                <h4 className="text-[#EAECEF] text-base font-bold leading-tight">{t('popularTitle')}</h4>
                <p className="text-[#848E9C] text-xs mt-1">{t('popularDesc')}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((c) => (
                <button
                  key={c.symbol}
                  onClick={() => buyCoin(c.symbol)}
                  className="group inline-flex items-center gap-1.5 rounded-lg border border-[#2B3139] bg-[#0B0E11] px-3 py-1.5 text-[#B7BDC6] transition-all duration-200 hover:border-[#F0B90B]/50 hover:text-[#EAECEF] hover:bg-[#23262E] cursor-pointer"
                >
                  <span className="text-sm whitespace-nowrap">{t('buyWord')} {c.name}</span>
                  <span className="text-[10px] font-semibold text-[#5E6673] group-hover:text-[#F0B90B] transition-colors tabular-nums">{c.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legal disclaimer */}
        <p className="text-[#5E6673] text-xs leading-relaxed mt-12 max-w-4xl">{t('footerLegal')}</p>

        {/* Bottom bar */}
        <div className="border-t border-[#2B3139] mt-8 pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-lg border border-[#2B3139] bg-[#0B0E11] px-3 py-1.5 text-[#B7BDC6] text-xs">
              <Globe className="h-3.5 w-3.5 text-[#848E9C]" />
              <span className="whitespace-nowrap">{native}</span>
              <span className="text-[#2B3139]">|</span>
              <span className="whitespace-nowrap tabular-nums">{t('currencyLabel')}</span>
            </div>
            <p className="text-[#5E6673] text-xs whitespace-nowrap">Basonce &copy; {new Date().getFullYear()}. {t('rights')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[#848E9C] text-xs">
            {BOTTOM.map((l) => (
              <button key={l.key} onClick={() => handle(l)} className="hover:text-[#EAECEF] cursor-pointer transition-colors whitespace-nowrap">
                {t(l.key)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-md bg-[#1E2329] border border-[#2B3139] rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-bold text-[#EAECEF]">{t(modal.titleKey)}</h3>
              <button aria-label={t('close')} onClick={() => setModal(null)} className="text-[#848E9C] hover:text-[#EAECEF]"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-[#B7BDC6] text-sm leading-relaxed">{t(modal.bodyKey)}</p>
            <button
              onClick={() => setModal(null)}
              className="mt-6 w-full py-2.5 bg-[#F0B90B] hover:bg-[#FCD535] text-black text-sm font-semibold rounded-lg transition-colors"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}
    </footer>
  );
}
