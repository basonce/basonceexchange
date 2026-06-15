import deviceBlue from '@assets/generated_images/device_blue.png';
import deviceCyan from '@assets/generated_images/device_cyan.png';
import deviceGold from '@assets/generated_images/device_gold.png';
import deviceFire from '@assets/generated_images/device_fire.png';
import devicePurple from '@assets/generated_images/device_purple.png';
import devicePrime from '@assets/generated_images/device_prime.png';

export interface ShopChest {
  img: string;
  glow: string;
}

// Equipment device art ordered from entry-tier to premium, each paired with a
// signature glow color. Clean, text-free renders (no labels baked into the art).
export const SHOP_CHESTS: ShopChest[] = [
  { img: deviceBlue, glow: '#3B82F6' },
  { img: deviceCyan, glow: '#22D3EE' },
  { img: deviceGold, glow: '#F0B90B' },
  { img: deviceFire, glow: '#FB923C' },
  { img: devicePurple, glow: '#A855F7' },
  { img: devicePrime, glow: '#D946EF' },
];

// Map an equipment / miner LEVEL to its device skin. Keying off the intrinsic
// level (not a price-rank built from a filtered shop list) guarantees the shop
// card and the owned-device card always render the SAME art for the same device.
export function chestForLevel(level: number): ShopChest {
  const i = Math.max(0, Math.min(SHOP_CHESTS.length - 1, Math.round(level || 0)));
  return SHOP_CHESTS[i];
}
