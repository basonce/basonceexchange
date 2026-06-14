import { useState } from 'react';
import { Cookie, Settings2, ArrowRight, ChevronRight, Check } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

const LAST_UPDATED = 'February 20, 2026';

interface CookieCategory {
  key: string;
  name: string;
  purpose: string;
  retention: string;
  locked?: boolean;
  defaultOn: boolean;
}

const CATEGORIES: CookieCategory[] = [
  {
    key: 'essential',
    name: 'Essential',
    purpose: 'Required for core functionality such as login, session security, and load balancing. The platform cannot operate without these.',
    retention: 'Session – 12 months',
    locked: true,
    defaultOn: true,
  },
  {
    key: 'performance',
    name: 'Performance',
    purpose: 'Collect anonymized metrics on how the platform is used so we can measure and improve speed and reliability.',
    retention: 'Up to 24 months',
    defaultOn: true,
  },
  {
    key: 'functional',
    name: 'Functional',
    purpose: 'Remember your preferences such as language, theme, and saved layouts to personalize your experience.',
    retention: 'Up to 12 months',
    defaultOn: true,
  },
  {
    key: 'targeting',
    name: 'Targeting',
    purpose: 'Used to deliver relevant marketing and measure the effectiveness of campaigns across channels.',
    retention: 'Up to 13 months',
    defaultOn: false,
  },
];

interface Section {
  id: string;
  num: string;
  title: string;
  body: string[];
}

const SECTIONS: Section[] = [
  {
    id: 'what',
    num: '1',
    title: 'What Are Cookies?',
    body: [
      'Cookies are small text files placed on your device when you visit a website. They allow the site to recognize your device, remember your preferences, and understand how you interact with the platform. We also use similar technologies such as pixels, local storage, and software development kits, which we refer to collectively as "cookies" in this Policy.',
    ],
  },
  {
    id: 'why',
    num: '2',
    title: 'Why We Use Cookies',
    body: [
      'We use cookies to keep you signed in securely, protect against fraud, remember your settings, measure platform performance, and — where you consent — deliver and measure marketing. The categories table above describes each type of cookie, its purpose, and how long it is retained.',
    ],
  },
  {
    id: 'manage',
    num: '3',
    title: 'How to Manage Cookies',
    body: [
      'You can manage non-essential cookies at any time using the preferences panel below. You can also control cookies through your browser settings, which allow you to block or delete cookies. Note that disabling certain cookies may affect the functionality and security of the platform.',
      'Essential cookies cannot be disabled because they are strictly necessary for the platform to operate.',
    ],
  },
  {
    id: 'third-party',
    num: '4',
    title: 'Third-Party Cookies',
    body: [
      'Some cookies are placed by trusted third parties that provide services on our behalf, such as analytics and security providers. These parties are contractually required to use the data only for the purposes we specify and to protect it appropriately.',
      'We do not control the cookie practices of external websites linked from our platform. We encourage you to review the cookie policies of those sites.',
    ],
  },
  {
    id: 'updates',
    num: '5',
    title: 'Updates to This Policy',
    body: [
      'We may update this Cookie Policy to reflect changes in technology, law, or our practices. The "Last updated" date indicates the most recent revision. Continued use of the platform after changes take effect constitutes acceptance of the updated Policy.',
    ],
  },
];

export default function CookiesPage({ onNavigate }: MorePageProps) {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.key, c.defaultOn]))
  );
  const [saved, setSaved] = useState(false);

  const toggle = (key: string, locked?: boolean) => {
    if (locked) return;
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  };

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans pb-24">
      {/* Document Header */}
      <section className="bg-[#181A20] border-b border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="flex items-center gap-2 text-xs text-[#848E9C] mb-6 uppercase tracking-widest">
            <span>Legal</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#EAECEF]">Cookie Policy</span>
          </div>
          <div className="flex items-start gap-5">
            <div className="shrink-0 w-14 h-14 rounded-xl bg-[#2B3139] flex items-center justify-center">
              <Cookie className="w-7 h-7 text-[#F0B90B]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-3">Cookie Policy</h1>
              <p className="text-[#B7BDC6] max-w-3xl leading-relaxed">
                How Basonce uses cookies and similar technologies, and how you can control them. You are in charge of your
                preferences.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-[#848E9C]">
                <Settings2 className="w-4 h-4" />
                <span>Last updated: <span className="text-[#EAECEF] font-medium">{LAST_UPDATED}</span></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-[1200px] mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
        {/* TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <div className="text-xs font-semibold text-[#848E9C] uppercase tracking-widest mb-4">Table of Contents</div>
            <nav className="space-y-1">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={() => setActive(s.id)}
                  className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active === s.id
                      ? 'bg-[#1E2329] text-[#F0B90B]'
                      : 'text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#181A20]'
                  }`}
                >
                  <span className="tabular-nums shrink-0 w-5">{s.num}.</span>
                  <span className="min-w-0">{s.title}</span>
                </a>
              ))}
              <a
                href="#preferences"
                className="flex items-start gap-2 px-3 py-2 rounded-lg text-sm text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#181A20] transition-colors"
              >
                <span className="tabular-nums shrink-0 w-5">6.</span>
                <span className="min-w-0">Cookie Preferences</span>
              </a>
            </nav>
          </div>
        </aside>

        {/* Sections */}
        <main className="min-w-0">
          {/* Signature: categories table */}
          <div className="mb-12">
            <h2 className="text-lg font-bold text-white mb-4">Cookie Categories</h2>
            <div className="border border-[#2B3139] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[680px]">
                  <thead>
                    <tr className="bg-[#1E2329] text-left text-[#848E9C] uppercase text-xs tracking-wider">
                      <th className="px-5 py-3 font-semibold">Category</th>
                      <th className="px-5 py-3 font-semibold">Purpose</th>
                      <th className="px-5 py-3 font-semibold whitespace-nowrap">Retention</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORIES.map((c, i) => (
                      <tr key={c.key} className={`${i !== 0 ? 'border-t border-[#2B3139]' : ''} bg-[#181A20]`}>
                        <td className="px-5 py-4 font-semibold text-[#EAECEF] whitespace-nowrap">
                          {c.name}
                          {c.locked && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider text-[#F0B90B] bg-[#F0B90B]/10 px-2 py-0.5 rounded">
                              Always On
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-[#B7BDC6]">{c.purpose}</td>
                        <td className="px-5 py-4 text-[#848E9C] whitespace-nowrap tabular-nums">{c.retention}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-12">
            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-[#F0B90B] font-bold text-lg tabular-nums">{s.num}.</span>
                  <h2 className="text-xl font-bold text-white tracking-tight">{s.title}</h2>
                </div>
                <div className="space-y-4 pl-0 lg:pl-8">
                  {s.body.map((p, i) => (
                    <p key={i} className="text-[#B7BDC6] text-[15px] leading-relaxed">{p}</p>
                  ))}
                </div>
              </section>
            ))}

            {/* Signature: preferences toggle panel */}
            <section id="preferences" className="scroll-mt-24">
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-[#F0B90B] font-bold text-lg tabular-nums">6.</span>
                <h2 className="text-xl font-bold text-white tracking-tight">Manage Your Cookie Preferences</h2>
              </div>
              <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-6 lg:ml-8">
                <p className="text-[#848E9C] text-sm mb-6">
                  Toggle the categories below to set your preferences. Essential cookies are always active.
                </p>
                <div className="space-y-3">
                  {CATEGORIES.map((c) => {
                    const on = prefs[c.key];
                    return (
                      <div
                        key={c.key}
                        className="flex items-center justify-between gap-4 p-4 bg-[#0B0E11] border border-[#2B3139] rounded-lg"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-[#EAECEF]">{c.name}</div>
                          <div className="text-xs text-[#848E9C] mt-1 leading-relaxed">{c.purpose}</div>
                        </div>
                        <button
                          onClick={() => toggle(c.key, c.locked)}
                          disabled={c.locked}
                          aria-label={`Toggle ${c.name} cookies`}
                          className={`relative shrink-0 w-12 h-6 rounded-full transition-colors ${
                            on ? 'bg-[#F0B90B]' : 'bg-[#2B3139]'
                          } ${c.locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                              on ? 'translate-x-6' : ''
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-6">
                  <button
                    onClick={() => setSaved(true)}
                    className="px-6 py-2.5 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors"
                  >
                    Save Preferences
                  </button>
                  <button
                    onClick={() => {
                      setPrefs(Object.fromEntries(CATEGORIES.map((c) => [c.key, true])));
                      setSaved(true);
                    }}
                    className="px-6 py-2.5 bg-transparent border border-[#2B3139] hover:bg-[#2B3139] text-white font-semibold rounded-lg transition-colors"
                  >
                    Accept All
                  </button>
                  {saved && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-[#0ECB81] font-medium">
                      <Check className="w-4 h-4" /> Preferences saved
                    </span>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Closing CTA */}
          <div className="mt-16 bg-[#181A20] border border-[#2B3139] rounded-xl p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-3">Trade with confidence on Basonce</h3>
            <p className="text-[#848E9C] mb-6 max-w-xl mx-auto">
              A transparent platform that respects your choices. Create an account and explore the markets.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={openAuthRegister}
                className="px-8 py-3 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                Create Account
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('home')}
                className="px-8 py-3 bg-transparent border border-[#2B3139] hover:bg-[#2B3139] text-white font-bold rounded-lg transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
