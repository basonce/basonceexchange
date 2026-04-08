import { EarnQuestPriceManager } from './earnquest-price';
import { BNCPriceManager } from './bnc-price';
import { PayAIPriceManager } from './payai-price';
import { SGPPriceManager } from './sgp-price';
import { PowerAIPriceManager } from './powerai-price';
import { SZNPPriceManager } from './sznp-price';
import { PunchPriceManager } from './punch-price';

// Clean up any orphaned old-version keys from previous releases
const OLD_KEYS = ['EQ_v4','EQ_v5','EQ_v6','BNC_v4','BNC_v5','PAYAI','POWERAI','SGP','SZNP','PUNCH'];
OLD_KEYS.forEach(k => {
  try {
    localStorage.removeItem(`kite_price_${k}`);
    localStorage.removeItem(`kite_cycle_${k}`);
  } catch { }
});

export function prewarmAllPriceManagers() {
  EarnQuestPriceManager.getInstance();
  BNCPriceManager.getInstance();
  PayAIPriceManager.getInstance();
  SGPPriceManager.getInstance();
  PowerAIPriceManager.getInstance();
  SZNPPriceManager.getInstance();
  PunchPriceManager.getInstance();
}
