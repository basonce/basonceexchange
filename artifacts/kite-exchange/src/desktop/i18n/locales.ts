// Generated translation catalog for NEW surface strings (namespaced keys like
// `assets.title`). The curated chrome dictionary in translations.ts is the first
// lookup layer; this is the second. English source lives in source/en.json.
//
// Locale files in ./locales/*.json are produced by scripts/i18n-generate.mjs
// (build-time Gemini drafts, then hand-verified). Missing keys fall back to the
// English source, so nothing is ever blank.

import EN_SOURCE_JSON from './source/en.json';

export const EN_SOURCE = EN_SOURCE_JSON as Record<string, string>;

const modules = import.meta.glob('./locales/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Record<string, string>>;

export const GENERATED: Record<string, Record<string, string>> = {};
for (const path in modules) {
  const m = path.match(/\/([^/]+)\.json$/);
  if (m) GENERATED[m[1]] = modules[path];
}
