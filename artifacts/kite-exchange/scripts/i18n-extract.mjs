// Harvest every static English UI string from the desktop source tree so the
// runtime auto-translator has an exact-match dictionary. We capture JSX text
// segments (between tags / expressions) plus literal placeholder / title /
// aria-label / label / alt attributes. Dynamic values (numbers, tickers, user
// data, interpolated text) are intentionally NOT captured — at runtime they
// simply never match the dictionary and are left untouched.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../src/desktop');
const OUT = path.resolve(__dirname, '../src/desktop/i18n/source/auto-en.json');

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'i18n') continue; // don't harvest the catalog itself
      out.push(...walk(p));
    } else if (/\.tsx$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

// A candidate is real UI copy if it reads like a label/sentence and contains
// no code, CSS or dynamic numeric data.
const BAD_CHARS = /[=;{}<>$`|_\\@#\[\]:]|=>|&&|\|\|/;
function accept(s) {
  const t = s.trim();
  if (t.length < 2 || t.length > 140) return false;
  if (!/^[A-Za-z0-9(]/.test(t)) return false;        // clean start
  if (!/[A-Za-z]{2,}/.test(t)) return false;         // has a real word
  if (BAD_CHARS.test(t)) return false;               // code / css / brackets / colons
  if (/[A-Za-z]\(/.test(t)) return false;            // function call e.g. formatAmount(
  if (/\.{2,}/.test(t)) return false;                // ellipsis / spread
  if (/^\//.test(t) || /\/$/.test(t)) return false;  // path fragment
  if (/\d[.,]\d/.test(t)) return false;              // decimal/comma number -> dynamic
  if (/\.(map|replace|filter|symbol|length|push|slice|toFixed|forEach|join)\b/.test(t)) return false;
  if (/\b(const|let|var|return|function|import|export|className|onClick|true|false|null|undefined|prev|props)\b/.test(t)) return false;
  if (/^[0-9.,%+\-\s]+$/.test(t)) return false;      // pure numeric
  return true;
}

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const TEXT_RE = /[>}]([^<>{}]+)[<{]/g;             // JSX text between tags/expressions
const ATTR_RE = /(?:placeholder|title|aria-label|alt|label)\s*=\s*"([^"{}]+)"/g;

const found = new Set();
for (const file of walk(ROOT)) {
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  let m;
  while ((m = TEXT_RE.exec(src))) {
    const raw = m[1].replace(/\s+/g, ' ').trim();
    if (accept(raw)) found.add(raw);
  }
  while ((m = ATTR_RE.exec(src))) {
    const raw = m[1].replace(/\s+/g, ' ').trim();
    if (accept(raw)) found.add(raw);
  }
}

// Second pass: harvest UI copy held as plain string values inside the
// `morePagesData.tsx` data file (titles, subtitles, stats labels, feature/step
// text, FAQ). The bespoke More pages render these object literals, so without
// this pass their core content stays untranslated. We decode escape sequences
// (e.g. \u2014 -> em dash) so the dictionary keys match the runtime DOM text.
function acceptData(s) {
  const t = s.trim();
  if (t.length < 2 || t.length > 300) return false;
  if (!/^[A-Za-z0-9(#$]/.test(t)) return false;
  if (!/[A-Za-z]{2,}/.test(t)) return false;
  if (/[{}<>=;`|\\]/.test(t)) return false;          // code-ish
  if (/^[0-9.,%+\-\s]+$/.test(t)) return false;      // pure numeric
  if (/^[\w.\-/]+$/.test(t) && !/\s/.test(t)) return false; // single token id/path
  return true;
}
const dataFile = path.resolve(ROOT, 'pages/morePagesData.tsx');
if (fs.existsSync(dataFile)) {
  let src = stripComments(fs.readFileSync(dataFile, 'utf8'));
  const start = src.indexOf('MORE_PAGES');
  if (start > 0) src = src.slice(start);
  const STR_RE = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = STR_RE.exec(src))) {
    const literal = m[1] !== undefined ? m[1] : m[2];
    let decoded;
    try {
      decoded = JSON.parse('"' + literal.replace(/"/g, '\\"') + '"');
    } catch {
      decoded = literal;
    }
    decoded = decoded.replace(/\s+/g, ' ').trim();
    if (acceptData(decoded)) found.add(decoded);
  }
}

const sorted = [...found].sort((a, b) => a.localeCompare(b));
const obj = {};
for (const s of sorted) obj[s] = s;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(obj, null, 2) + '\n', 'utf8');
console.log(`Extracted ${sorted.length} unique strings -> ${path.relative(process.cwd(), OUT)}`);
