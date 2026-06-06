import { supabase } from '../../lib/supabase';
import { bdexPriceService } from '../../lib/bdex-price-service';
import { fetchBinanceFuturesTicker, fetchBinanceTicker } from '../../lib/binance';
import { PriceCache } from '../../lib/price-cache';
import { isTradFiSymbol } from '../../lib/tradfi-data';
import { getCachedTradFiPrice } from '../../lib/tradfi-price-service';
import { EarnQuestPriceManager } from '../../lib/earnquest-price';
import { PayAIPriceManager } from '../../lib/payai-price';
import { SGPPriceManager } from '../../lib/sgp-price';
import { PowerAIPriceManager } from '../../lib/powerai-price';
import { SZNPPriceManager } from '../../lib/sznp-price';
import { PunchPriceManager } from '../../lib/punch-price';
import { BNCPriceManager } from '../../lib/bnc-price';

/**
 * Independent in-house coin price getters. MUST mirror FuturesPage's
 * INDEPENDENT_PRICE_MANAGERS so desktop entry/close prices match mobile exactly.
 */
const INDEPENDENT_PRICE_MANAGERS: Record<string, () => number> = {
  EQUSDT: () => EarnQuestPriceManager.getInstance().getPrice(),
  BNCUSDT: () => BNCPriceManager.getInstance().getPrice(),
  PAYAIUSDT: () => PayAIPriceManager.getInstance().getPrice(),
  SGPUSDT: () => SGPPriceManager.getInstance().getPrice(),
  POWERAIUSDT: () => PowerAIPriceManager.getInstance().getPrice(),
  SZNPUSDT: () => SZNPPriceManager.getInstance().getPrice(),
  PUNCHUSDT: () => PunchPriceManager.getInstance().getPrice(),
};

const INDEPENDENT_PRICE_TABLES: Record<string, { table: string; idCol: string; idVal: number | string; priceCol: string }> = {
  EQUSDT: { table: 'earnquest_price', idCol: 'id', idVal: 1, priceCol: 'current_price' },
};

/**
 * Resolve a fresh, authoritative price for a FUTURES symbol.
 * Replicates FuturesPage.fetchFreshPrice byte-for-byte (same source order)
 * so desktop position open/close uses identical pricing as mobile.
 */
export async function fetchFreshFuturesPrice(symbol: string): Promise<number> {
  if (symbol.startsWith('BDEX_')) {
    const price = await bdexPriceService.fetchLatestPrice(symbol);
    if (price > 0) return price;
    const cached = bdexPriceService.getPrice(symbol);
    if (cached > 0) return cached;
  }

  if (isTradFiSymbol(symbol)) {
    const liveData = getCachedTradFiPrice(symbol);
    if (liveData && liveData.price > 0) return liveData.price;
  }

  const dbSource = INDEPENDENT_PRICE_TABLES[symbol];
  if (dbSource) {
    try {
      const { data } = await supabase
        .from(dbSource.table)
        .select(dbSource.priceCol)
        .eq(dbSource.idCol, dbSource.idVal)
        .maybeSingle();
      if (data?.[dbSource.priceCol]) {
        const p = parseFloat(data[dbSource.priceCol]);
        if (p > 0) return p;
      }
    } catch {}
  }

  const indepGetter = INDEPENDENT_PRICE_MANAGERS[symbol];
  if (indepGetter) {
    const p = indepGetter();
    if (p > 0) return p;
  }

  const ticker = await fetchBinanceFuturesTicker(symbol);
  if (ticker) {
    const lp = parseFloat(ticker.lastPrice);
    if (lp > 0) return lp;
  }

  const pc = PriceCache.getInstance();
  const cached = pc.get(symbol);
  if (cached && cached.price > 0) return cached.price;

  try {
    const coinSymbol = symbol.replace('USDT', '');
    const { data } = await supabase
      .from('supported_coins')
      .select('current_price_usdt')
      .eq('symbol', coinSymbol)
      .maybeSingle();
    if (data?.current_price_usdt && data.current_price_usdt > 0) {
      return data.current_price_usdt;
    }
  } catch {}

  return 0;
}

/** Fresh spot price for a base symbol (e.g. "BTC"); used for spot market orders. */
export async function fetchFreshSpotPrice(symbol: string): Promise<number> {
  const futuresStyle = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;
  const indepGetter = INDEPENDENT_PRICE_MANAGERS[futuresStyle];
  if (indepGetter) {
    const p = indepGetter();
    if (p > 0) return p;
  }
  const binSym = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;
  const ticker = await fetchBinanceTicker(binSym);
  if (ticker) {
    const lp = parseFloat(ticker.lastPrice);
    if (lp > 0) return lp;
  }
  const pc = PriceCache.getInstance();
  const cached = pc.get(binSym);
  if (cached && cached.price > 0) return cached.price;
  return 0;
}

export { INDEPENDENT_PRICE_MANAGERS };
