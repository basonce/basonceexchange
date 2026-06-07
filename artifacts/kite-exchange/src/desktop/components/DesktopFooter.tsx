import { useState } from 'react';
import { X } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';
import type { TKey } from '../i18n/translations';
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

interface Props { onNavigate: (tab: DeskTab) => void }

export default function DesktopFooter({ onNavigate }: Props) {
  const { t } = useLang();
  const [modal, setModal] = useState<{ titleKey: TKey; bodyKey: TKey } | null>(null);

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
    <footer className="bg-[#181A20] border-t border-[#2B3139] mt-12">
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="h-9 w-9 flex items-center justify-center overflow-hidden shrink-0">
                <img src="/basonce_logo_son_biten.png" alt="Basonce" className="w-[175%] max-w-none mix-blend-lighten" />
              </span>
              <span className="text-[#EAECEF] font-semibold text-lg tracking-[0.2em]">BASONCE</span>
            </div>
            <p className="text-[#848E9C] text-sm leading-relaxed">{t('footerDesc')}</p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[#EAECEF] font-semibold text-sm mb-4">{t(col.title)}</h4>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.key}>
                    <button
                      onClick={() => handle(l)}
                      className="text-[#848E9C] hover:text-[#F0B90B] text-sm cursor-pointer transition-colors text-left"
                    >
                      {t(l.key)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-[#2B3139] mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[#5E6673] text-xs">Basonce © {new Date().getFullYear()}. {t('rights')}</p>
          <div className="flex items-center gap-5 text-[#848E9C] text-xs">
            {BOTTOM.map((l) => (
              <button key={l.key} onClick={() => handle(l)} className="hover:text-[#EAECEF] cursor-pointer transition-colors">
                {t(l.key)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-md bg-[#1E2329] border border-[#2B3139] rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-bold text-[#EAECEF]">{t(modal.titleKey)}</h3>
              <button onClick={() => setModal(null)} className="text-[#848E9C] hover:text-[#EAECEF]"><X className="w-5 h-5" /></button>
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
