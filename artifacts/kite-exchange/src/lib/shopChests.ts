import deviceCpu from '@assets/generated_images/dev2_cpu.png';
import deviceGpu from '@assets/generated_images/dev2_gpu.png';
import deviceGpuMax from '@assets/generated_images/dev2_gpu_max.png';
import deviceAsic from '@assets/generated_images/dev2_asic.png';
import deviceFarm from '@assets/generated_images/dev2_farm.png';
import deviceIndustrial from '@assets/generated_images/dev2_industrial.png';
import deviceQuantum from '@assets/generated_images/dev2_quantum.png';

export interface ShopChest {
  img: string;
  glow: string;
}

// Each device gets its OWN distinct render + signature glow. Keyed by the
// canonical equipment NAME (mining_equipment_types.name), because level is NOT
// unique (e.g. two different level-1 GPUs). Keying off name guarantees the shop
// card and the owned-device card render the SAME, correct art for each device.
const BY_NAME: Record<string, ShopChest> = {
  'cpu miner pro': { img: deviceCpu, glow: '#3B82F6' },
  'gpu miner pro': { img: deviceGpu, glow: '#22D3EE' },
  'gpu miner pro max': { img: deviceGpuMax, glow: '#F0B90B' },
  'asic miner pro': { img: deviceAsic, glow: '#FB923C' },
  'mining farm': { img: deviceFarm, glow: '#A855F7' },
  'industrial mining station': { img: deviceIndustrial, glow: '#D946EF' },
  'quantum mining datacenter': { img: deviceQuantum, glow: '#10B981' },
};

// Ordered entry -> premium, used only as a fallback for an unknown name.
const FALLBACK_ORDER: ShopChest[] = [
  BY_NAME['cpu miner pro'],
  BY_NAME['gpu miner pro'],
  BY_NAME['gpu miner pro max'],
  BY_NAME['asic miner pro'],
  BY_NAME['mining farm'],
  BY_NAME['industrial mining station'],
  BY_NAME['quantum mining datacenter'],
];

function normalize(name: string): string {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Resolve a device skin by name. Falls back to the level-ordered list if the
// name is not recognised, so a new/renamed device still shows a sensible image.
export function chestForName(name: string, level = 0): ShopChest {
  const hit = BY_NAME[normalize(name)];
  if (hit) return hit;
  const i = Math.max(0, Math.min(FALLBACK_ORDER.length - 1, Math.round(level || 0)));
  return FALLBACK_ORDER[i];
}
