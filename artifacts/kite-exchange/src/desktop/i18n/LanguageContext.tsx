import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { TRANSLATIONS, EN, LANGUAGES, type TKey } from './translations';
import { GENERATED, EN_SOURCE } from './locales';

const STORAGE_KEY = 'desk_lang';

// Resolve a key across both layers: curated chrome dictionary first, then the
// generated surface catalog, falling back to English so nothing is ever blank.
function resolve(lang: string, key: string): string {
  const curated = TRANSLATIONS[lang];
  if (curated && key in curated) return (curated as Record<string, string>)[key];
  const gen = GENERATED[lang];
  if (gen && key in gen) return gen[key];
  if (key in EN) return (EN as Record<string, string>)[key];
  if (key in EN_SOURCE) return EN_SOURCE[key];
  return key;
}

function detectInitial(): string {
  // Always default to English. Only honor a language the user EXPLICITLY chose
  // before (saved in localStorage). We intentionally ignore navigator.language
  // so the site never auto-opens in the browser's locale (e.g. Turkish).
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (saved && TRANSLATIONS[saved]) return saved;
  return 'en';
}

interface LangCtx {
  lang: string;
  setLang: (code: string) => void;
  t: (key: TKey | string) => string;
  languages: typeof LANGUAGES;
}

const Ctx = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<string>(detectInitial);

  const setLang = useCallback((code: string) => {
    if (!TRANSLATIONS[code]) return;
    setLangState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch {}
  }, []);

  useEffect(() => {
    try { document.documentElement.lang = lang; } catch {}
  }, [lang]);

  const t = useCallback((key: TKey | string): string => resolve(lang, key), [lang]);

  const value = useMemo(() => ({ lang, setLang, t, languages: LANGUAGES }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe fallback if used outside provider — always English.
    return {
      lang: 'en',
      setLang: () => {},
      t: (k: TKey | string) => resolve('en', k),
      languages: LANGUAGES,
    };
  }
  return ctx;
}
