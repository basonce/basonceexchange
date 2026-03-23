import { TRADFI_ASSETS, getTradFiAsset } from './tradfi-data';

export interface TradFiPriceData {
  price: number;
  change: number;
  change24h: number;
}

type Listener = () => void;

const livePrice = new Map<string, number>();
const liveChange = new Map<string, number>();
const listeners = new Map<string, Set<Listener>>();
const globalListeners = new Set<Listener>();

let fetchIntervalId: ReturnType<typeof setInterval> | null = null;
let microIntervalId: ReturnType<typeof setInterval> | null = null;
let lastFetchTime = 0;
const FETCH_INTERVAL_MS = 60_000;
const MICRO_INTERVAL_MS = 2000;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mgfviqdxeupajntpylig.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZnZpcWR4ZXVwYWpudHB5bGlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjgwNDksImV4cCI6MjA4NzA0NDA0OX0.zxca3lBfqHt4EQ1pFLGlDkZUQJY1iQXaZA0cOflJc18';

function initFallbackPrices() {
  const t = Date.now() / 1000;
  TRADFI_ASSETS.forEach((asset, i) => {
    if (!livePrice.has(asset.symbol)) {
      const offset = i * 7.3;
      const slow = Math.sin(t * 0.0031 + offset) * 0.35;
      const med = Math.sin(t * 0.0093 + offset * 1.7) * 0.25;
      const fast = Math.sin(t * 0.0211 + offset * 2.3) * 0.15;
      const drift = (slow + med + fast) * asset.volatility * asset.basePrice;
      livePrice.set(asset.symbol, asset.basePrice + drift);
      const v = Math.sin(t * 0.0041 + offset) * 0.45 + Math.cos(t * 0.0073 + offset * 1.4) * 0.25;
      liveChange.set(asset.symbol, parseFloat((v * 0.6).toFixed(2)));
    }
  });
}

async function fetchAllPrices() {
  try {
    const url = `${SUPABASE_URL}/functions/v1/tradfi-prices?all=true`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return;
    const json = await res.json();
    const data: Record<string, { price: number; change: number } | null> = json.data || {};

    let anyChanged = false;
    Object.entries(data).forEach(([sym, val]) => {
      if (!val || val.price <= 0) return;
      const prev = livePrice.get(sym) ?? 0;
      livePrice.set(sym, val.price);
      liveChange.set(sym, val.change);
      if (Math.abs(val.price - prev) / (prev || 1) > 0.0001) {
        const subs = listeners.get(sym);
        if (subs) subs.forEach(fn => fn());
        anyChanged = true;
      }
    });

    lastFetchTime = Date.now();
    if (anyChanged) globalListeners.forEach(fn => fn());
  } catch {
    // silently fall back to simulated prices
  }
}

function applyMicroMovement() {
  const t = Date.now() / 1000;
  TRADFI_ASSETS.forEach((asset, i) => {
    const base = livePrice.get(asset.symbol);
    if (!base) return;
    const spread = base * asset.volatility * 0.08 * (Math.random() * 2 - 1);
    const micro = base + spread;
    livePrice.set(asset.symbol, micro);

    const offset = i * 7.3;
    const v = Math.sin(t * 0.0041 + offset) * 0.45 + Math.cos(t * 0.0073 + offset * 1.4) * 0.25;
    liveChange.set(asset.symbol, parseFloat((v * 0.6).toFixed(2)));

    const subs = listeners.get(asset.symbol);
    if (subs && subs.size > 0) subs.forEach(fn => fn());
  });
  if (globalListeners.size > 0) globalListeners.forEach(fn => fn());
}

function ensureRunning() {
  if (fetchIntervalId) return;

  initFallbackPrices();
  fetchAllPrices();

  fetchIntervalId = setInterval(fetchAllPrices, FETCH_INTERVAL_MS);
  microIntervalId = setInterval(applyMicroMovement, MICRO_INTERVAL_MS);
}

export function getCachedTradFiPrice(symbol: string): TradFiPriceData | null {
  const asset = getTradFiAsset(symbol);
  if (!asset) return null;
  const price = livePrice.get(asset.symbol);
  const change = liveChange.get(asset.symbol) ?? 0;
  if (!price || price <= 0) {
    return { price: asset.basePrice, change: 0, change24h: 0 };
  }
  return { price, change, change24h: change };
}

export async function getTradFiPrice(symbol: string): Promise<TradFiPriceData | null> {
  ensureRunning();
  return getCachedTradFiPrice(symbol);
}

export function subscribeTradFiPrice(symbol: string, cb: Listener): () => void {
  const asset = getTradFiAsset(symbol);
  const key = asset?.symbol ?? symbol;
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(cb);
  ensureRunning();
  return () => listeners.get(key)?.delete(cb);
}

export function subscribeAllTradFiPrices(cb: Listener): () => void {
  globalListeners.add(cb);
  ensureRunning();
  return () => globalListeners.delete(cb);
}

export function getAllTradFiPrices(): Map<string, TradFiPriceData> {
  const result = new Map<string, TradFiPriceData>();
  TRADFI_ASSETS.forEach(asset => {
    const price = livePrice.get(asset.symbol) ?? asset.basePrice;
    const change = liveChange.get(asset.symbol) ?? 0;
    result.set(asset.symbol, { price, change, change24h: change });
  });
  return result;
}

export function startTradFiPriceUpdater(): () => void {
  ensureRunning();
  return () => {
    if (fetchIntervalId) { clearInterval(fetchIntervalId); fetchIntervalId = null; }
    if (microIntervalId) { clearInterval(microIntervalId); microIntervalId = null; }
  };
}

export function stopTradFiPriceUpdater(): void {
  if (fetchIntervalId) { clearInterval(fetchIntervalId); fetchIntervalId = null; }
  if (microIntervalId) { clearInterval(microIntervalId); microIntervalId = null; }
}
