import chestBlue from '@assets/image_1781218358087.png';
import chestBlueDeep from '@assets/image_1781218376742.png';
import chestGold from '@assets/image_1781218313770.png';
import chestFire from '@assets/image_1781218423839.png';
import chestQuantum from '@assets/image_1781218398098.png';
import chestPrime from '@assets/image_1781218444835.png';

export interface ShopChest {
  img: string;
  glow: string;
}

// Equipment chest art ordered from entry-tier (simple) to premium (paid),
// each paired with a signature glow color for the shop card.
export const SHOP_CHESTS: ShopChest[] = [
  { img: chestBlue, glow: '#3B82F6' },
  { img: chestBlueDeep, glow: '#22D3EE' },
  { img: chestGold, glow: '#F0B90B' },
  { img: chestFire, glow: '#FB923C' },
  { img: chestQuantum, glow: '#A855F7' },
  { img: chestPrime, glow: '#D946EF' },
];

// Map each shop item to a chest, spreading the art evenly across the
// price range so the cheapest item gets the simplest chest and the most
// expensive gets the most premium one.
export function buildChestMap(items: { id: string; price: number }[]): Map<string, ShopChest> {
  const map = new Map<string, ShopChest>();
  const ordered = [...items].sort((a, b) => a.price - b.price);
  const n = ordered.length;
  ordered.forEach((item, idx) => {
    const ratio = n <= 1 ? 0 : idx / (n - 1);
    const chestIdx = Math.round(ratio * (SHOP_CHESTS.length - 1));
    map.set(item.id, SHOP_CHESTS[chestIdx]);
  });
  return map;
}
