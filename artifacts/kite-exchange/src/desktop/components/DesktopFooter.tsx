import { useState } from 'react';
import {
  X, Send, Twitter, Facebook, Instagram, Youtube, Linkedin, MessageCircle, Github,
  ShieldCheck, FileCheck, Lock, Headset, Globe, ArrowUpRight,
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
      { key: 'about', action: { type: 'info', bodyKey: 'comingSoon' } },
      { key: 'careers', action: { type: 'info', bodyKey: 'comingSoon' } },
      { key: 'announcements', action: { type: 'info', bodyKey: 'comingSoon' } },
      { key: 'news', action: { type: 'info', bodyKey: 'comingSoon' } },
      { key: 'press', action: { type: 'info', bodyKey: 'comingSoon' } },
      { key: 'community', action: { type: 'info', bodyKey: 'comingSoon' } },
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
      { key: 'affiliate', action: { type: 'info', bodyKey: 'comingSoon' } },
      { key: 'referral', action: { type: 'info', bodyKey: 'comingSoon' } },
      { key: 'api', action: { type: 'info', bodyKey: 'comingSoon' } },
      { key: 'fees', action: { type: 'info', bodyKey: 'comingSoon' } },
      { key: 'tradingRules', action: { type: 'info', bodyKey: 'comingSoon' } },
      { key: 'status', action: { type: 'info', bodyKey: 'statusOk' } },
    ],
  },
  {
    title: 'colSupport',
    links: [
      { key: 'helpCenter', action: { type: 'info', bodyKey: 'comingSoon' } },
      { key: 'chatSupport', action: { type: 'info', bodyKey: 'comingSoon' } },
      { key: 'submitRequest', action: { type: 'info', bodyKey: 'comingSoon' } },
      { key: 'lawEnforcement', action: { type: 'info', bodyKey: 'comingSoon' } },
      { key: 'notices', action: { type: 'info', bodyKey: 'comingSoon' } },
    ],
  },
  {
    title: 'colLearn',
    links: [
      { key: 'buyBitcoin', action: { type: 'coin', symbol: 'BTC' } },
      { key: 'buyEthereum', action: { type: 'coin', symbol: 'ETH' } },
      { key: 'cryptoGlossary', action: { type: 'info', bodyKey: 'comingSoon' } },
      { key: 'tradingGuide', action: { type: 'info', bodyKey: 'comingSoon' } },
      { key: 'marketsOverview', action: { type: 'nav', tab: 'markets' } },
    ],
  },
];

const BOTTOM: FooterLink[] = [
  { key: 'terms', action: { type: 'info', bodyKey: 'comingSoon' } },
  { key: 'privacy', action: { type: 'info', bodyKey: 'comingSoon' } },
  { key: 'cookies', action: { type: 'info', bodyKey: 'comingSoon' } },
  { key: 'riskWarning', action: { type: 'info', bodyKey: 'comingSoon' } },
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

interface Props { onNavigate: (tab: DeskTab) => void }

export default function DesktopFooter({ onNavigate }: Props) {
  const { t, lang } = useLang();
  const [modal, setModal] = useState<{ titleKey: TKey; bodyKey: TKey } | null>(null);

  const native = LANGUAGES.find((l) => l.code === lang)?.native ?? 'English';

  const handle = (link: FooterLink) => {
    const a = link.action;
    if (a.type === 'nav') { onNavigate(a.tab); window.scrollTo({ top: 0 }); }
    else if (a.type === 'coin') {
      localStorage.setItem('selectedCoinSymbol', a.symbol);
      window.dispatchEvent(new CustomEvent('desk-select-coin', { detail: a.symbol }));
      onNavigate('trade');
      window.scrollTo({ top: 0 });
    } else {
      setModal({ titleKey: link.key, bodyKey: a.bodyKey });
    }
  };

  return (
    <footer className="relative bg-[#181A20] border-t border-[#2B3139] mt-12 overflow-hidden">
      {/* top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F0B90B]/50 to-transparent" />
      {/* soft corner glows */}
      <div className="pointer-events-none absolute -left-32 -top-24 h-72 w-72 rounded-full bg-[#F0B90B]/[0.06] blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[#F0B90B]/[0.04] blur-3xl" />

      <div className="relative max-w-[1600px] mx-auto px-6 pt-14 pb-24">
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
                  onClick={() => setModal({ titleKey: 'community', bodyKey: 'comingSoon' })}
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
