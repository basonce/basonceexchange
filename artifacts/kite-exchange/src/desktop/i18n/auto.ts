// Auto-translation dictionary used by the runtime DOM translator
// (AutoTranslate.tsx). Each locale file maps an English UI string to its
// translation in that language. English source lives in source/auto-en.json
// and is produced by scripts/i18n-extract.mjs; locale files in ./locales-auto
// are produced by scripts/i18n-generate.mjs (Gemini drafts).
//
// Lookup is by EXACT trimmed English text, so dynamic content (numbers,
// tickers, balances, user data) never matches and is left untouched.

const modules = import.meta.glob('./locales-auto/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Record<string, string>>;

export const AUTO: Record<string, Record<string, string>> = {};
for (const path in modules) {
  const m = path.match(/\/([^/]+)\.json$/);
  if (m) AUTO[m[1]] = modules[path];
}

// Languages that actually have a generated dictionary available.
export const AUTO_LANGS = new Set(Object.keys(AUTO));
