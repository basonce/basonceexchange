import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { TRANSLATIONS, EN, LANGUAGES, type TKey } from './translations';
import { GENERATED, EN_SOURCE } from './locales';

const STORAGE_KEY = 'desk_lang';
const VALID_LANGS = new Set(LANGUAGES.map((l) => l.code));

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
  // The site ALWAYS opens in English on a fresh page load. The browser locale
  // (navigator.language) is intentionally ignored so it never auto-opens in
  // Turkish or any other language. A language the user picks applies for the
  // current session; reloading the page returns to English by design.
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
    // Accept any language listed in LANGUAGES (the dropdown). Languages without a
    // generated dictionary fall back to English gracefully via the resolvers.
    if (!VALID_LANGS.has(code)) return;
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
