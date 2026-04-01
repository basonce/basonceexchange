import { EarnQuestPriceManager } from './earnquest-price';
import { BNCPriceManager } from './bnc-price';
import { PayAIPriceManager } from './payai-price';
import { SGPPriceManager } from './sgp-price';
import { PowerAIPriceManager } from './powerai-price';
import { SZNPPriceManager } from './sznp-price';
import { PunchPriceManager } from './punch-price';

export function prewarmAllPriceManagers() {
  EarnQuestPriceManager.getInstance();
  BNCPriceManager.getInstance();
  PayAIPriceManager.getInstance();
  SGPPriceManager.getInstance();
  PowerAIPriceManager.getInstance();
  SZNPPriceManager.getInstance();
  PunchPriceManager.getInstance();
}
