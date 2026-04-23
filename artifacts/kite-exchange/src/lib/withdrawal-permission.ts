import { supabase } from './supabase';
import { fetchUserRestrictions } from './user-restrictions';

export interface WithdrawalPermission {
  allowed: boolean;
  // Wagering bilgileri
  bonusReceived: number;        // Toplam alınan bonus (USDT)
  wageringVolume: number;       // Toplam yapılan işlem hacmi (USDT)
  wageringRequired: number;     // Çekim için gereken işlem hacmi (bonus * 5)
  wageringRemaining: number;    // Kalan işlem hacmi
  progressPercentage: number;   // 0-100
  // Deposit alternatif yolu
  depositTotal: number;         // Toplam yatırım (USDT) — onaylı
  depositRequired: number;      // Çekim için gereken min. yatırım
  depositRemaining: number;     // Kalan yatırım
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
// Bonus aldıysan: (a) 5x hacim YA DA (b) 200 USDT yatırım yap → çekim açılır
const DEPOSIT_UNLOCK_THRESHOLD_USDT = 200;

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

    // Per-user lock — backward compatible:
    //   • Eski kullanıcılarda değer var ama bayrak yok → KİLİTLİ (geri dönük uyumluluk)
    //   • Admin "🔒 KİLİTLE" basmış (bonus_lock_enabled=true) → KİLİTLİ
    //   • Admin "🔓 KİLİDİ AÇ" basmış (bonus_lock_enabled=false) → SERBEST (manuel açma)
    let customMinVolume = 0;
    let customMinDeposit = 0;
    try {
      const restr = await fetchUserRestrictions(userId) as any;
      if (restr) {
        const v = parseFloat(restr.min_volume_usdt ?? 0) || 0;
        const d = parseFloat(restr.min_deposit_usdt ?? 0) || 0;
        const hasValues = v > 0 || d > 0;
        const explicitlyUnlocked = restr.bonus_lock_enabled === false;
        const explicitlyLocked   = restr.bonus_lock_enabled === true;
        const shouldLock = explicitlyLocked || (hasValues && !explicitlyUnlocked);
        if (shouldLock) {
          customMinVolume = v;
          customMinDeposit = d;
        }
      }
    } catch {}

    // If admin set custom volume → use it directly. Otherwise fall back to bonus * 5x rule.
    const wageringRequired = customMinVolume > 0
      ? customMinVolume
      : bonusReceived * WAGERING_MULTIPLIER;
    const wageringRemaining = Math.max(0, wageringRequired - wageringVolume);
    const progressPercentage = wageringRequired > 0
      ? Math.min(100, (wageringVolume / wageringRequired) * 100)
      : 100;

    // 3) Toplam onaylı yatırımı (USDT) hesapla — wallet_transactions (confirmed)
    let depositTotal = 0;
    try {
      const { data: txs } = await supabase
        .from('wallet_transactions')
        .select('amount,amount_usd,token_symbol,status')
        .eq('user_id', userId)
        .eq('status', 'confirmed');
      if (txs && txs.length > 0) {
        for (const t of txs as any[]) {
          const sym = String(t.token_symbol || '').toUpperCase();
          const usd = parseFloat(t.amount_usd ?? 0);
          if (!isNaN(usd) && usd > 0) { depositTotal += usd; continue; }
          if (sym === 'USDT' || sym === 'USDC' || sym === 'BUSD' || sym === 'DAI') {
            const amt = parseFloat(t.amount ?? 0);
            if (!isNaN(amt) && amt > 0) depositTotal += amt;
          }
        }
      }
    } catch {}
    // Per-user override: if admin set custom min_deposit_usdt → use it
    const depositRequired = customMinDeposit > 0 ? customMinDeposit : DEPOSIT_UNLOCK_THRESHOLD_USDT;
    const depositRemaining = Math.max(0, depositRequired - depositTotal);

    // 4) YENİ KURAL: Sadece admin "🔒 KİLİTLE" tuşuna basıp bonus_lock_enabled=true yaptıysa kilitle.
    //    Eski "bonus aldıysan otomatik 5x hacim" kuralı KALDIRILDI — kafa karışıklığı yaratıyordu.
    //    Eski bonus işaretlemeleri artık çekimi engellemiyor; sadece manuel kilit geçerli.
    const hasCustomLimit = customMinVolume > 0 || customMinDeposit > 0;
    if (!hasCustomLimit) {
      return {
        allowed: true,
        bonusReceived: 0,
        wageringVolume,
        wageringRequired: 0,
        wageringRemaining: 0,
        progressPercentage: 100,
        depositTotal,
        depositRequired,
        depositRemaining,
        currentTier: 5,
      };
    }

    // 5) Bonus VAR — iki yoldan biri yeterli:
    //    (a) yeterli wagering tamamlandı  YA DA  (b) ≥ 200 USDT yatırım yapıldı
    const wageringMet = wageringVolume >= wageringRequired;
    const depositMet  = depositTotal   >= depositRequired;

    if (!wageringMet && !depositMet) {
      const tier = Math.min(5, Math.floor(progressPercentage / 20));
      return {
        allowed: false,
        bonusReceived,
        wageringVolume,
        wageringRequired,
        wageringRemaining,
        progressPercentage,
        depositTotal,
        depositRequired,
        depositRemaining,
        currentTier: tier,
        requiredTier: { id: 'wagering_or_deposit', name: 'Volume or Deposit', price: wageringRemaining, tier: 5 },
        message: bonusReceived > 0
          ? `Because you received a bonus, you must EITHER complete $${wageringRequired.toFixed(2)} in trading volume OR deposit at least $${depositRequired} USDT to unlock withdrawals (including bonuses).`
          : `To unlock withdrawals on your account, you must EITHER complete $${wageringRequired.toFixed(2)} in trading volume OR deposit at least $${depositRequired} USDT.`,
      };
    }

    // 6) Şart sağlandı — çekim serbest
    return {
      allowed: true,
      bonusReceived,
      wageringVolume,
      wageringRequired,
      wageringRemaining: 0,
      progressPercentage: 100,
      depositTotal,
      depositRequired,
      depositRemaining: 0,
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
      depositTotal: 0,
      depositRequired: DEPOSIT_UNLOCK_THRESHOLD_USDT,
      depositRemaining: DEPOSIT_UNLOCK_THRESHOLD_USDT,
      currentTier: 0,
      message: 'Withdrawal permission could not be verified',
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
