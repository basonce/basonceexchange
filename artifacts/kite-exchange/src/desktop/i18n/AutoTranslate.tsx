import { useEffect } from 'react';
import { useLang } from './LanguageContext';
import { AUTO } from './auto';

// Runtime DOM auto-translator.
//
// When the active language is not English, this replaces any text node /
// attribute whose EXACT (whitespace-normalized) text matches an entry in the
// generated dictionary for that language. Matching is exact against a curated
// English-label dictionary, so dynamic content (numbers, prices, tickers,
// balances, coin names, user input) is never in the dictionary and is left
// untouched — this is what keeps the approach safe.
//
// Per node we remember the original English source AND the exact value we last
// wrote. If React later rewrites a node we previously translated, our written
// value no longer matches the live value, so we treat the new value as a fresh
// source instead of trusting a stale cache. Switching languages — or back to
// English — always re-derives from that source.

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT',
  'CODE', 'PRE', 'SVG', 'PATH',
]);
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const OBS_OPTS: MutationObserverInit = {
  subtree: true,
  childList: true,
  characterData: true,
  attributeFilter: ATTRS,
};

type TextRec = { src: string; out: string };
type AttrRec = Record<string, { src: string; out: string }>;
const textRec = new WeakMap<Text, TextRec>();
const attrRec = new WeakMap<Element, AttrRec>();

function splitWhitespace(raw: string): [string, string, string] {
  const lead = raw.match(/^\s*/)?.[0] ?? '';
  const trail = raw.match(/\s*$/)?.[0] ?? '';
  const core = raw.slice(lead.length, raw.length - trail.length);
  return [lead, core, trail];
}

// Lookup key mirrors the extractor, which collapses internal whitespace.
const keyOf = (core: string) => core.replace(/\s+/g, ' ');

function translateTextNode(node: Text, dict: Record<string, string> | null) {
  const parent = node.parentElement;
  if (parent) {
    if (SKIP_TAGS.has(parent.tagName)) return;
    if (parent.closest('[data-no-i18n]')) return;
    if (parent.isContentEditable) return;
  }
  const cur = node.nodeValue ?? '';
  const rec = textRec.get(node);
  // Trust the cached source only if the node still shows what we wrote; if React
  // changed it, the current value IS the new source.
  const source = rec && rec.out === cur ? rec.src : cur;
  const [lead, core, trail] = splitWhitespace(source);
  if (!core) return;
  const key = keyOf(core);

  let target: string;
  if (dict && dict[key] != null) {
    target = lead + dict[key] + trail;
  } else if (rec && rec.out === cur) {
    target = source; // restore English (switched to en, or no entry in new lang)
  } else {
    return; // unknown label that we never translated -> leave React's value alone
  }

  if (cur !== target) node.nodeValue = target;
  if (dict && dict[key] != null) textRec.set(node, { src: source, out: target });
  else textRec.delete(node);
}

function translateElementAttrs(el: Element, dict: Record<string, string> | null) {
  let store = attrRec.get(el);
  for (const attr of ATTRS) {
    const has = el.hasAttribute(attr);
    const recorded = store && attr in store;
    if (!has && !recorded) continue;
    const cur = el.getAttribute(attr) ?? '';
    const rec = recorded ? store![attr] : undefined;
    const source = rec && rec.out === cur ? rec.src : cur;
    const [lead, core, trail] = splitWhitespace(source);
    if (!core) continue;
    const key = keyOf(core);

    let target: string;
    if (dict && dict[key] != null) {
      target = lead + dict[key] + trail;
    } else if (rec && rec.out === cur) {
      target = source;
    } else {
      continue;
    }

    if (cur !== target) el.setAttribute(attr, target);
    if (dict && dict[key] != null) {
      if (!store) { store = {}; attrRec.set(el, store); }
      store[attr] = { src: source, out: target };
    } else if (store && attr in store) {
      delete store[attr];
    }
  }
}

function walk(root: Node, dict: Record<string, string> | null) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, dict);
    return;
  }
  if (!(root instanceof Element)) return;

  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n = tw.nextNode();
  const texts: Text[] = [];
  while (n) { texts.push(n as Text); n = tw.nextNode(); }
  for (const t of texts) translateTextNode(t, dict);

  translateElementAttrs(root, dict);
  const ew = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let e = ew.nextNode();
  while (e) { translateElementAttrs(e as Element, dict); e = ew.nextNode(); }
}

export default function AutoTranslate() {
  const { lang } = useLang();

  useEffect(() => {
    const dict = lang === 'en' ? null : AUTO[lang] ?? null;

    let frame = 0;
    let observer: MutationObserver | null = null;
    const pending = new Set<Node>();

    const flush = () => {
      frame = 0;
      if (observer) observer.disconnect();
      for (const node of pending) {
        if (node.isConnected) walk(node, dict);
      }
      pending.clear();
      if (observer) observer.observe(document.body, OBS_OPTS);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(flush);
    };

    // One full pass so the initial render (and switching back to English) is
    // fully resolved before we fall back to incremental, mutation-targeted work.
    walk(document.body, dict);

    // Only keep observing while a non-English language is active.
    if (dict) {
      observer = new MutationObserver((muts) => {
        for (const m of muts) {
          if (m.type === 'childList') {
            m.addedNodes.forEach((node) => pending.add(node));
          } else {
            // characterData -> Text node; attributes -> Element.
            pending.add(m.target);
          }
        }
        if (pending.size) schedule();
      });
      observer.observe(document.body, OBS_OPTS);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
    };
  }, [lang]);

  return null;
}
