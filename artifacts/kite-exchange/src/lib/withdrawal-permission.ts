import { supabase } from './supabase';

export interface WithdrawalPermission {
  allowed: boolean;
  // Wagering bilgileri
  bonusReceived: number;        // Toplam alınan bonus (USDT)
  wageringVolume: number;       // Toplam yapılan işlem hacmi (USDT)
  wageringRequired: number;     // Çekim için gereken işlem hacmi (bonus * 5)
  wageringRemaining: number;    // Kalan işlem hacmi
  progressPercentage: number;   // 0-100
  message?: string;
  // ESKİ alan adları (geri uyumluluk için tutuldu)
  currentTier: number;          // 0-5 arası progress göstergesi
  requiredTier?: {
    id: string;
    name: string;
    price: number;
    tier: number;
  };
}

const WAGERING_MULTIPLIER = 5;

export async function checkWithdrawalPermission(userId: string): Promise<WithdrawalPermission> {
  try {
    // 1) Toplam alınan bonus'u activity_log'tan topla
    const { data: bonusLogs } = await supabase
      .from('activity_log')
      .select('metadata')
      .eq('user_id', userId)
      .eq('action', 'bonus_received');

    let bonusReceived = 0;
    if (bonusLogs && bonusLogs.length > 0) {
      for (const row of bonusLogs) {
        const md: any = row.metadata || {};
        const amt = parseFloat(md.amount_usdt ?? md.amount ?? 0);
        if (!isNaN(amt) && amt > 0) bonusReceived += amt;
      }
    }

    // 2) Toplam işlem hacmini user_profiles'tan al
    const { data: prof } = await supabase
      .from('user_profiles')
      .select('total_volume_usdt')
      .eq('user_id', userId)
      .maybeSingle();
    const wageringVolume = parseFloat((prof?.total_volume_usdt as any) || '0') || 0;

    const wageringRequired = bonusReceived * WAGERING_MULTIPLIER;
    const wageringRemaining = Math.max(0, wageringRequired - wageringVolume);
    const progressPercentage = wageringRequired > 0
      ? Math.min(100, (wageringVolume / wageringRequired) * 100)
      : 100;

    // 3) Bonus YOKSA serbest çekim
    if (bonusReceived <= 0) {
      return {
        allowed: true,
        bonusReceived: 0,
        wageringVolume,
        wageringRequired: 0,
        wageringRemaining: 0,
        progressPercentage: 100,
        currentTier: 5,
      };
    }

    // 4) Bonus VAR ama yeterli wagering yapılmamış
    if (wageringVolume < wageringRequired) {
      const tier = Math.min(5, Math.floor(progressPercentage / 20));
      return {
        allowed: false,
        bonusReceived,
        wageringVolume,
        wageringRequired,
        wageringRemaining,
        progressPercentage,
        currentTier: tier,
        requiredTier: {
          id: 'wagering',
          name: `İşlem Hacmi Şartı`,
          price: wageringRemaining,
          tier: 5,
        },
        message: `Bonus aldığınız için çekim öncesi $${wageringRequired.toFixed(2)} işlem hacmi tamamlamanız gerekiyor. Mevcut: $${wageringVolume.toFixed(2)} / $${wageringRequired.toFixed(2)} (Kalan: $${wageringRemaining.toFixed(2)})`,
      };
    }

    // 5) Wagering tamamlandı — çekim serbest
    return {
      allowed: true,
      bonusReceived,
      wageringVolume,
      wageringRequired,
      wageringRemaining: 0,
      progressPercentage: 100,
      currentTier: 5,
    };
  } catch (error) {
    console.error('Error checking withdrawal permission:', error);
    return {
      allowed: false,
      bonusReceived: 0,
      wageringVolume: 0,
      wageringRequired: 0,
      wageringRemaining: 0,
      progressPercentage: 0,
      currentTier: 0,
      message: 'Çekim izni doğrulanamadı',
    };
  }
}

/**
 * Bonus aldığında çağır → activity_log'a kaydedilir.
 * Çekim öncesi wagering şartı bu kayıtlara göre hesaplanır.
 */
export async function logBonusReceived(
  userId: string,
  amountUsdt: number,
  bonusType: string,
  extra: Record<string, unknown> = {}
): Promise<void> {
  if (!userId || !amountUsdt || amountUsdt <= 0) return;
  try {
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'bonus_received',
      page: 'system',
      metadata: {
        amount_usdt: amountUsdt,
        bonus_type: bonusType,
        wagering_required: amountUsdt * WAGERING_MULTIPLIER,
        ...extra,
      },
    });
  } catch (e) {
    console.warn('logBonusReceived failed', e);
  }
}

/**
 * ESKİ getUserTierInfo — geri uyumluluk için tutuldu (mining ekipman tier'ları).
 * Yeni kontroller için checkWithdrawalPermission kullan.
 */
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
      hasTier: (_tier: number) => false,
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
