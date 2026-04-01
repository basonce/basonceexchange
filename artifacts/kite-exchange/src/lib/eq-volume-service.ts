// Central volume getter for EQ/USDT — delegates to EarnQuestPriceManager cycle engine.
// All pages must use getEQVolume() so the number is always identical everywhere.
import { EarnQuestPriceManager } from './earnquest-price';

/** Returns the current EQ 24h volume — same value everywhere, always. */
export function getEQVolume(): number {
  return EarnQuestPriceManager.getInstance().getVolume();
}

/** Subscribe to volume updates. Returns unsubscribe fn. */
export function subscribeEQVolume(cb: () => void): () => void {
  return EarnQuestPriceManager.getInstance().subscribe(cb);
}
