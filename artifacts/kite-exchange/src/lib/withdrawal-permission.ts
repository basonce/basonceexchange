import { supabase } from './supabase';

export interface WithdrawalPermission {
  allowed: boolean;
  currentTier: number;
  requiredTier?: {
    id: string;
    name: string;
    price: number;
    tier: number;
  };
  message?: string;
  progressPercentage: number;
}

export async function checkWithdrawalPermission(userId: string): Promise<WithdrawalPermission> {
  try {
    // Get user's equipment
    const { data: userEquipment, error: equipError } = await supabase
      .from('user_mining_equipment')
      .select(`
        equipment_type_id,
        mining_equipment_types (
          id,
          name,
          tier,
          price,
          blocks_withdrawal
        )
      `)
      .eq('user_id', userId);

    if (equipError) throw equipError;

    // Find highest tier user owns
    let highestTier = 0;
    if (userEquipment && userEquipment.length > 0) {
      const tiers = userEquipment
        .map(eq => (eq.mining_equipment_types as any)?.tier || 0)
        .filter(t => t > 0);
      highestTier = tiers.length > 0 ? Math.max(...tiers) : 0;
    }

    const progressPercentage = (highestTier / 5) * 100;

    // Tier 5 = FULL ACCESS
    if (highestTier >= 5) {
      return {
        allowed: true,
        currentTier: 5,
        progressPercentage: 100,
      };
    }

    // Get next required tier
    const { data: nextTier, error: nextError } = await supabase
      .from('mining_equipment_types')
      .select('id, name, price, tier')
      .eq('tier', highestTier + 1)
      .maybeSingle();

    if (nextError) throw nextError;

    // No withdrawal until Tier 5
    return {
      allowed: false,
      currentTier: highestTier,
      requiredTier: nextTier ? {
        id: nextTier.id,
        name: nextTier.name,
        price: nextTier.price,
        tier: nextTier.tier,
      } : undefined,
      message: nextTier
        ? `Para çekmek için ${nextTier.name} ($${nextTier.price.toLocaleString()}) almanız gerekiyor`
        : 'Withdrawal requires Tier 5 equipment',
      progressPercentage,
    };
  } catch (error) {
    console.error('Error checking withdrawal permission:', error);
    return {
      allowed: false,
      currentTier: 0,
      message: 'Unable to verify withdrawal permission',
      progressPercentage: 0,
    };
  }
}

export async function getUserTierInfo(userId: string) {
  const { data: userEquipment } = await supabase
    .from('user_mining_equipment')
    .select(`
      mining_equipment_types (
        tier,
        name,
        icon
      )
    `)
    .eq('user_id', userId);

  if (!userEquipment || userEquipment.length === 0) {
    return {
      hasTier: (tier: number) => false,
      highestTier: 0,
      ownedTiers: [],
    };
  }

  const ownedTiers = userEquipment
    .map(eq => ({
      tier: (eq.mining_equipment_types as any)?.tier || 0,
      name: (eq.mining_equipment_types as any)?.name || '',
      icon: (eq.mining_equipment_types as any)?.icon || '',
    }))
    .filter(t => t.tier > 0);

  const highestTier = ownedTiers.length > 0
    ? Math.max(...ownedTiers.map(t => t.tier))
    : 0;

  return {
    hasTier: (tier: number) => ownedTiers.some(t => t.tier === tier),
    highestTier,
    ownedTiers,
  };
}
