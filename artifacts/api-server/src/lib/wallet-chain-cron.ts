import { logger } from './logger.js';
import { SUPABASE_URL, SUPABASE_KEY } from './supabase-config.js';
const SCAN_INTERVAL = 2 * 60 * 1000; // 2 dakika

let cronStarted = false;

async function runScan(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  const url = `${SUPABASE_URL}/functions/v1/auto-wallet-scanner`;
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
      },
      body: JSON.stringify({ triggered_by: 'server-cron' }),
      signal: AbortSignal.timeout(90_000), // 90 sn timeout
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn({ status: res.status, body: text.slice(0, 200) }, '[wallet-cron] edge fn HTTP hatası');
      return;
    }

    const result = await res.json().catch(() => ({}));
    const elapsed = Date.now() - start;

    if (result.success === false) {
      logger.warn({ error: result.error }, '[wallet-cron] edge fn başarısız döndü');
      return;
    }

    const wallets  = result.wallets_scanned ?? 0;
    const found    = result.new_transactions ?? 0;
    const credited = result.credited_to_balances ?? 0;

    if (found > 0) {
      logger.info(
        { wallets, found, credited, ms: elapsed },
        `[wallet-cron] ✅ ${found} yeni işlem bulundu! ${credited} bakiyeye yazıldı`
      );
    } else {
      logger.debug({ wallets, ms: elapsed }, '[wallet-cron] Tarama tamam — yeni işlem yok');
    }
  } catch (err: any) {
    if (err?.name === 'TimeoutError') {
      logger.warn('[wallet-cron] Edge fn 90sn içinde yanıt vermedi (timeout)');
    } else {
      logger.warn({ err: String(err) }, '[wallet-cron] Fetch hatası');
    }
  }
}

export function startWalletChainCron(): void {
  // DEVRE DIŞI — auto-wallet-scanner edge fn saatlerdir timeout alıyor,
  // veritabanı bağlantı havuzunu tüketip auth servisini de kilitledi.
  // Edge fn düzelene kadar bu cron kapalı.
  logger.warn('[wallet-cron] Cron devre dışı bırakıldı (edge fn timeout sorunu)');
}
