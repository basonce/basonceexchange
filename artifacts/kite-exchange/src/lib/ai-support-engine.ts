import { Agent } from './agent-assignment';

export interface UserProfile {
  language: string;
  experienceLevel: 'beginner' | 'intermediate' | 'expert';
  emotionalState: 'calm' | 'anxious' | 'frustrated' | 'urgent' | 'curious';
  intent: 'problem_solving' | 'information' | 'withdrawal' | 'deposit' | 'balance' | 'investment' | 'general';
  messageCount: number;
  lastTopic?: string;
}

export interface BonusInfo {
  total_bonus_usd: number;
  wagering_required: number;
  wagering_done: number;
  wagering_remaining: number;
  progress_pct: number;
  withdrawal_blocked: boolean;
  bonus_count: number;
  last_bonus_at?: string | null;
}

export interface UserContextData {
  found: boolean;
  error?: string | null;
  profile?: Record<string, unknown>;
  balances?: Array<Record<string, unknown>>;
  active_mining?: Array<Record<string, unknown>>;
  recent_transactions?: Array<Record<string, unknown>>;
  open_futures?: Array<Record<string, unknown>>;
  recent_futures_history?: Array<Record<string, unknown>>;
  open_spot_orders?: Array<Record<string, unknown>>;
  mining_summary?: Record<string, unknown>;
  bonus_info?: BonusInfo | null;
}

interface ConversationMessage {
  role: 'customer' | 'agent';
  text: string;
}

interface ConversationContext {
  messages: ConversationMessage[];
  customerLanguage: string;
  agentName: string;
  userProfile?: UserProfile;
  userContext?: UserContextData | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function analyzeUserProfile(
  messages: ConversationMessage[],
  language: string
): UserProfile {
  const customerMessages = messages.filter(m => m.role === 'customer').map(m => m.text.toLowerCase()).join(' ');
  const latestMessage = messages.filter(m => m.role === 'customer').slice(-1)[0]?.text.toLowerCase() || '';

  let experienceLevel: UserProfile['experienceLevel'] = 'beginner';
  const expertTerms = ['liquidation', 'funding rate', 'mark price', 'isolated margin', 'cross margin', 'order book', 'tasfiye', 'fonlama', 'marj modu', 'tx hash', 'blockchain', 'bscscan', 'tronscan', 'gas fee'];
  const intermediateTerms = ['leverage', 'kaldıraç', 'futures', 'tp', 'sl', 'stop loss', 'limit order', 'short', 'long', 'pnl', 'bep20', 'trc20', 'withdrawal', 'çekim', 'kyc', 'verify'];
  if (expertTerms.some(t => customerMessages.includes(t))) experienceLevel = 'expert';
  else if (intermediateTerms.some(t => customerMessages.includes(t))) experienceLevel = 'intermediate';

  let emotionalState: UserProfile['emotionalState'] = 'calm';
  const urgentWords = ['acil', 'hemen', 'şimdi', 'urgent', 'immediately', 'right now', 'asap', 'paraları kayboldu', 'funds gone', 'lost my money', 'param kayboldu', 'kayıp para'];
  const frustrationWords = ['olmadı', 'çalışmıyor', 'hâlâ', 'hala', 'neden', 'saçma', 'rezalet', 'berbat', 'not working', 'still not', 'why', 'ridiculous', 'terrible', 'saatlerdir', 'günlerdir', 'bekliyorum', 'been waiting'];
  const anxiousWords = ['endişe', 'korku', 'para yok', 'kayboldu', 'worried', 'scared', 'missing', 'lost', 'gone', 'gitmiş', 'gelmedi', 'görünmüyor', 'not showing'];

  if (urgentWords.some(w => customerMessages.includes(w))) emotionalState = 'urgent';
  else if (frustrationWords.some(w => customerMessages.includes(w))) emotionalState = 'frustrated';
  else if (anxiousWords.some(w => customerMessages.includes(w))) emotionalState = 'anxious';
  else if (latestMessage.includes('?') || latestMessage.includes('nasıl') || latestMessage.includes('how') || latestMessage.includes('what')) emotionalState = 'curious';

  let intent: UserProfile['intent'] = 'general';
  let lastTopic: string | undefined;

  const withdrawalWords = ['çek', 'çekim', 'withdraw', 'cash out', 'para çek', 'çekemiyorum', 'çekilmiyor', 'cannot withdraw'];
  const depositWords = ['yatır', 'yatırım', 'deposit', 'para yatır', 'yatamıyorum', 'gelmedi', 'gelmiyor', 'para gelmedi'];
  const balanceWords = ['bakiye', 'balance', 'para yok', 'görünmüyor', 'hesap', 'eksik', 'missing funds', 'wrong balance'];
  const investmentWords = ['mining', 'ekipman', 'equipment', 'buy', 'satın', 'invest', 'al'];
  const problemWords = ['sorun', 'problem', 'hata', 'error', 'gelmedi', 'olmadı', 'issue', 'failed', 'not working'];

  if (withdrawalWords.some(w => customerMessages.includes(w))) { intent = 'withdrawal'; lastTopic = 'withdrawal'; }
  else if (depositWords.some(w => customerMessages.includes(w))) { intent = 'deposit'; lastTopic = 'deposit'; }
  else if (balanceWords.some(w => customerMessages.includes(w))) { intent = 'balance'; lastTopic = 'balance'; }
  else if (problemWords.some(w => customerMessages.includes(w))) { intent = 'problem_solving'; }
  else if (investmentWords.some(w => customerMessages.includes(w))) { intent = 'investment'; lastTopic = 'mining'; }
  else if (messages.filter(m => m.role === 'customer').length > 0) intent = 'information';

  return {
    language,
    experienceLevel,
    emotionalState,
    intent,
    messageCount: messages.filter(m => m.role === 'customer').length,
    lastTopic,
  };
}

/**
 * Enrich existing userContext with bonus + wagering info pulled directly from Supabase.
 * Adds bonus_info field so AI can give personalized, accurate withdrawal answers.
 */
export async function enrichUserContextWithBonus(
  ctx: UserContextData,
  supabaseClient: { from: (t: string) => { select: (c: string) => { eq: (col: string, val: unknown) => Promise<{ data: unknown[] | null }> & { maybeSingle?: () => Promise<{ data: unknown }> } } } }
): Promise<UserContextData> {
  try {
    const profile = ctx.profile as Record<string, unknown> | undefined;
    const userId = (profile?.id || profile?.user_id) as string | undefined;
    if (!userId) return { ...ctx, bonus_info: null };

    const bonusRowsRes = await supabaseClient
      .from('activity_log')
      .select('metadata,created_at')
      .eq('user_id', userId);
    const bonusRows = ((bonusRowsRes as { data: Array<{ metadata?: Record<string, unknown>; created_at?: string; action?: string }> | null }).data || []);
    const bonusOnly = bonusRows.filter(r => (r as Record<string, unknown>).action === 'bonus_received' || (r.metadata as Record<string, unknown> | undefined)?.bonus_type);

    let totalBonus = 0;
    let lastBonusAt: string | null = null;
    for (const row of bonusOnly) {
      const md = (row.metadata || {}) as Record<string, unknown>;
      const amt = parseFloat((md.amount_usdt ?? md.amount ?? 0) as string);
      if (!isNaN(amt) && amt > 0) totalBonus += amt;
      if (row.created_at && (!lastBonusAt || row.created_at > lastBonusAt)) lastBonusAt = row.created_at;
    }

    const totalVolumeRaw = (profile?.total_volume_usdt as string | number | undefined) ?? 0;
    const wageringDone = parseFloat(String(totalVolumeRaw)) || 0;
    const wageringRequired = totalBonus * 5;
    const wageringRemaining = Math.max(0, wageringRequired - wageringDone);
    const progressPct = wageringRequired > 0 ? Math.min(100, (wageringDone / wageringRequired) * 100) : 100;

    const bonus_info: BonusInfo = {
      total_bonus_usd: totalBonus,
      wagering_required: wageringRequired,
      wagering_done: wageringDone,
      wagering_remaining: wageringRemaining,
      progress_pct: progressPct,
      withdrawal_blocked: totalBonus > 0 && wageringDone < wageringRequired,
      bonus_count: bonusOnly.length,
      last_bonus_at: lastBonusAt,
    };
    return { ...ctx, bonus_info };
  } catch {
    return { ...ctx, bonus_info: null };
  }
}

/**
 * Detect language from a single message (latin, cyrillic, arabic, chinese, korean).
 * Used per-message so we always answer in the customer's CURRENT language.
 */
export function detectMessageLanguage(text: string): string {
  const t = (text || '').toLowerCase();
  if (/[\u0600-\u06ff]/.test(t)) return 'ar';
  if (/[\u4e00-\u9fff]/.test(t)) return 'zh';
  if (/[\uac00-\ud7af]/.test(t)) return 'ko';
  if (/[\u0400-\u04ff]/.test(t)) return 'ru';
  // Turkish-specific markers (chars + common words)
  if (/[ğüşöçı]/i.test(text) || /\b(merhaba|nasıl|para|çek|yatır|bakiye|hesap|teşekkür|nerede|niye|olmadı|olmuyor|bonus aldım|ne yapacağım|yardım|nasilsin)\b/.test(t)) return 'tr';
  // Spanish
  if (/[ñ¿¡]/.test(text) || /\b(hola|gracias|cómo|cuándo|dinero|saldo|retirar|depósito|ayuda)\b/.test(t)) return 'es';
  // French
  if (/\b(bonjour|merci|comment|argent|solde|retrait|dépôt|aide|pourquoi)\b/.test(t)) return 'fr';
  // German
  if (/[ßäöü]/.test(text) || /\b(hallo|danke|wie|geld|guthaben|abheben|einzahlung|hilfe)\b/.test(t)) return 'de';
  // Portuguese
  if (/\b(olá|obrigado|como|dinheiro|saldo|retirar|depósito|ajuda)\b/.test(t)) return 'pt';
  return 'en';
}

export async function verifyUserAndGetContext(userId: string): Promise<UserContextData | null> {
  try {
    const numericId = parseInt(userId.trim(), 10);
    if (isNaN(numericId)) return null;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-support-chat/verify-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: numericId }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data.found) return null;
    return data.context as UserContextData;
  } catch {
    return null;
  }
}

export async function generateAIResponseFromOpenAI(
  userMessage: string,
  context: ConversationContext
): Promise<string | null> {
  try {
    const allMessages = [
      ...context.messages.map(m => ({
        role: m.role === 'customer' ? 'user' : 'assistant',
        content: m.text,
      })),
      { role: 'user', content: userMessage },
    ];

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-support-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: allMessages,
        agentName: context.agentName,
        customerLanguage: context.customerLanguage,
        userProfile: context.userProfile,
        userContext: context.userContext || null,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (data.fallback || !data.response) return null;
    return data.response;
  } catch {
    return null;
  }
}

const FINANCIAL_RESPONSES_TR = {
  withdrawal_no_kyc: 'Para çekimi için KYC doğrulamanızı tamamlamanız gerekiyor. Profile > Identity Verification bölümüne gidin, kimlik kartı veya pasaportunuzun fotoğrafını yükleyin ve selfie çekin. Onay 1-3 iş günü içinde tamamlanır.',
  withdrawal_general: 'Para çekimi için Assets > Withdraw bölümüne gidin. Coin ve ağı (BEP20 veya TRC20) seçin, miktarı ve cüzdan adresinizi girin. İşlemler güvenlik incelemesinden sonra 1-24 saat içinde tamamlanır.',
  withdrawal_pending: 'Çekim işleminiz güvenlik incelemesinde. Bu normal bir süreç, 1-24 saat içinde tamamlanır. 24 saati geçtiyse lütfen çekim ID\'nizi paylaşın.',
  deposit_general: 'Para yatırmak için Assets > Deposit bölümüne gidin. Coin ve ağı seçin (BEP20 veya TRC20), adresi kopyalayıp gönderin. Minimum 10 USDT, 5-30 dakika içinde onaylanır.',
  deposit_not_arrived: 'İşleminiz henüz onaylanmamış olabilir (5-30 dk). TX Hash\'inizi (blockchain işlem numarasını) paylaşırsanız durumu kontrol edebilirim. TX Hash\'i gönderdiğiniz cüzdanın işlem geçmişinde bulabilirsiniz.',
  deposit_wrong_network: 'Yanlış ağ kullanıldıysa transfer geri alınamaz. TX Hash\'i paylaşırsanız hangi ağa gittiğini kontrol edelim. Bir daha yatırım yaparken gönderdiğiniz ağ ile seçtiğiniz ağın aynı olduğuna dikkat edin.',
  balance_locked: 'Bakiyenizin bir kısmı kilitli olabilir — açık emirler veya futures pozisyonları bakiyeyi kilitler. Assets > Transaction History\'den tüm hareketleri görebilirsiniz.',
  balance_transfer: 'Spot ve Futures bakiyeniz ayrıdır. Futures\'tan Spot\'a para aktarmak için Assets > Transfer bölümünü kullanın. Transfer anlık gerçekleşir.',
  kyc_required: 'Tam çekim hakları için KYC doğrulaması gerekiyor. Profile > Identity Verification bölümüne giderek belge yükleyebilirsiniz. Onay süresi 1-3 iş günüdür.',
  mining_general: 'Mining bölümünden ekipman satın alarak EQ token kazanabilirsiniz. CPU Miner Pro ücretsiz olarak verilir. Kazandığınız EQ\'yu Swap bölümünden USDT\'ye çevirebilirsiniz.',
  eq_swap: 'EQ tokenlarınızı USDT\'ye çevirmek için Mining > Swap bölümüne gidin. Miktar girin ve döviz kurunu onaylayın. İşlem anlık gerçekleşir.',
};

const FINANCIAL_RESPONSES_EN = {
  withdrawal_no_kyc: 'KYC verification is required to withdraw funds. Go to Profile > Identity Verification, upload your ID/passport photos, and take a selfie. Approval takes 1-3 business days.',
  withdrawal_general: 'To withdraw, go to Assets > Withdraw. Select coin and network (BEP20 or TRC20), enter the amount and wallet address. Processing takes 1-24 hours after security review.',
  withdrawal_pending: 'Your withdrawal is under security review. This is normal and takes 1-24 hours. If it has been over 24 hours, please share your withdrawal ID.',
  deposit_general: 'To deposit, go to Assets > Deposit. Select coin and network (BEP20 or TRC20), copy the address and send. Minimum 10 USDT, confirms in 5-30 minutes.',
  deposit_not_arrived: 'Your transaction may still be confirming (5-30 min). Please share your TX Hash (blockchain transaction ID) and I will check the status for you. You can find it in your sending wallet\'s transaction history.',
  deposit_wrong_network: 'If the wrong network was used, the transfer cannot be recovered. Share your TX Hash and I\'ll check which network it went to. In the future, always ensure the sending network matches the selected network.',
  balance_locked: 'Part of your balance may be locked — open orders or futures positions lock balance. Check Assets > Transaction History to see all movements.',
  balance_transfer: 'Spot and Futures balances are separate. To move funds from Futures to Spot, use Assets > Transfer. Transfer is instant.',
  kyc_required: 'Full withdrawal access requires KYC verification. Go to Profile > Identity Verification to upload your documents. Approval takes 1-3 business days.',
  mining_general: 'Purchase equipment in the Mining section to earn EQ tokens. CPU Miner Pro is free. Convert your EQ to USDT in the Swap section.',
  eq_swap: 'To convert EQ tokens to USDT, go to Mining > Swap. Enter the amount and confirm the exchange rate. Transaction is instant.',
};

const GENERIC_RESPONSES: Record<string, string[]> = {
  tr: [
    'Sorunuzu daha iyi anlayabilmem için biraz daha detay verir misiniz? Para yatırma, çekme, bakiye, mining veya hesap güvenliği konularında yardımcı olabilirim.',
    'Bu konuda size yardımcı olmak istiyorum. Hangi işlemi yapmaya çalışıyorsunuz? Adım adım rehberlik edebilirim.',
    'Size en iyi yardımı sunabilmem için durumu netleştirelim. Hangi bölümde sorun yaşıyorsunuz?',
  ],
  en: [
    'Could you provide more details so I can better understand your issue? I can help with deposits, withdrawals, balances, mining, or account security.',
    'I\'d like to help you with this. What operation are you trying to perform? I can guide you step by step.',
    'Let me clarify the situation to provide you the best help. Which section are you experiencing the issue in?',
  ],
  de: [
    'Könnten Sie mehr Details angeben, damit ich Ihr Problem besser verstehen kann?',
    'Ich würde Ihnen gerne helfen. Welchen Vorgang versuchen Sie durchzuführen?',
  ],
  es: [
    '¿Podrías proporcionar más detalles para entender mejor tu problema?',
    'Me gustaría ayudarte. ¿Qué operación intentas realizar?',
  ],
  fr: [
    'Pourriez-vous fournir plus de détails pour mieux comprendre votre problème?',
    'Je voudrais vous aider. Quelle opération essayez-vous d\'effectuer?',
  ],
  ar: ['هل يمكنك تقديم مزيد من التفاصيل لفهم مشكلتك بشكل أفضل؟'],
  zh: ['您能提供更多详细信息以便我更好地理解您的问题吗？'],
};

function getPersonalizedFinancialResponse(
  userMessage: string,
  lang: string,
  userContext: UserContextData | null | undefined,
  userProfile: UserProfile | undefined
): string | null {
  const msg = userMessage.toLowerCase();
  const isTr = lang === 'tr';
  const responses = isTr ? FINANCIAL_RESPONSES_TR : FINANCIAL_RESPONSES_EN;

  const usdtBalance = userContext?.balances?.find(b => b.symbol === 'USDT');
  const kycStatus = (userContext?.profile as Record<string, unknown> | undefined)?.verification_status as string | undefined;
  const lastTransactions = userContext?.recent_transactions || [];

  const isWithdrawal = ['çekim', 'çekemiyorum', 'çek', 'withdraw', 'para çek', 'çekilmiyor', 'cannot withdraw'].some(w => msg.includes(w));
  const isDeposit = ['yatırım', 'yatır', 'deposit', 'para yatır', 'gelmedi', 'gelmiyor', 'yatamıyorum'].some(w => msg.includes(w));
  const isBalance = ['bakiye', 'balance', 'para yok', 'görünmüyor', 'eksik', 'missing', 'nerede'].some(w => msg.includes(w));
  const isMining = ['mining', 'madencilik', 'ekipman', 'equipment', 'eq'].some(w => msg.includes(w));
  const isSwap = ['swap', 'takas', 'dönüştür', 'convert', 'eq usdt'].some(w => msg.includes(w));

  if (isWithdrawal) {
    // ★ HIGHEST PRIORITY: Bonus + Wagering check — explains EXACT amounts in customer's language
    const bi = userContext?.bonus_info;
    if (bi && bi.withdrawal_blocked) {
      const b = bi.total_bonus_usd.toFixed(2);
      const req = bi.wagering_required.toFixed(2);
      const done = bi.wagering_done.toFixed(2);
      const left = bi.wagering_remaining.toFixed(2);
      const pct = bi.progress_pct.toFixed(0);
      const bonusBlockedMsg: Record<string, string> = {
        tr: `Hesabınızda toplam $${b} bonus var, bu yüzden çekim için $${req} işlem hacmi (bonus × 5) yapmanız gerekiyor. Şu ana kadar $${done} hacim yaptınız (%${pct}), $${left} daha kalmış. Spot veya Futures'ta işlem açıp kapatarak bu hacmi tamamlayabilirsiniz. Tamamlanınca çekim otomatik açılır.`,
        en: `Your account has $${b} in total bonuses, so withdrawal requires $${req} in trading volume (bonus × 5). You've completed $${done} so far (${pct}%), with $${left} remaining. Open and close trades on Spot or Futures to complete this volume — withdrawal unlocks automatically when finished.`,
        es: `Tu cuenta tiene $${b} en bonos, por lo que el retiro requiere $${req} de volumen de operaciones (bono × 5). Has completado $${done} (${pct}%), faltan $${left}. Abre y cierra operaciones en Spot o Futuros para completar este volumen — el retiro se desbloquea automáticamente.`,
        fr: `Votre compte a $${b} de bonus, le retrait nécessite donc $${req} de volume de trading (bonus × 5). Vous avez fait $${done} (${pct}%), il reste $${left}. Ouvrez et fermez des positions sur Spot ou Futures — le retrait se débloque automatiquement.`,
        de: `Ihr Konto hat $${b} Bonus, daher erfordert die Auszahlung $${req} Handelsvolumen (Bonus × 5). Sie haben $${done} (${pct}%) abgeschlossen, $${left} verbleiben. Eröffnen und schließen Sie Trades auf Spot oder Futures — die Auszahlung wird automatisch freigeschaltet.`,
        ru: `На вашем счёте бонусов на $${b}, для вывода нужен торговый объём $${req} (бонус × 5). Вы выполнили $${done} (${pct}%), осталось $${left}. Открывайте и закрывайте сделки на Spot или Futures — вывод откроется автоматически.`,
        ar: `حسابك يحتوي على $${b} مكافآت، لذا يتطلب السحب حجم تداول $${req} (المكافأة × 5). أكملت $${done} (${pct}%)، تبقى $${left}. افتح وأغلق الصفقات على Spot أو Futures وسيتم فتح السحب تلقائيًا.`,
        zh: `您的账户有 $${b} 奖金，因此提现需要 $${req} 交易量（奖金 × 5）。您已完成 $${done}（${pct}%），剩余 $${left}。在 Spot 或 Futures 开仓平仓完成此交易量后，提现将自动解锁。`,
        pt: `Sua conta tem $${b} em bônus, portanto o saque requer $${req} de volume de negociação (bônus × 5). Você completou $${done} (${pct}%), faltam $${left}. Abra e feche operações em Spot ou Futuros — o saque desbloqueia automaticamente.`,
      };
      return bonusBlockedMsg[lang] || bonusBlockedMsg.en;
    }
    // ★ Bonus completed but they still ask — confirm withdrawal is open
    if (bi && bi.total_bonus_usd > 0 && !bi.withdrawal_blocked) {
      const b = bi.total_bonus_usd.toFixed(2);
      const okMsg: Record<string, string> = {
        tr: `Tebrikler! $${b} bonus için gereken işlem hacmini tamamlamışsınız, çekim hakkınız açık. Assets > Withdraw bölümünden çekim talebinizi oluşturabilirsiniz. KYC tamamlanmış ise işlem 1-24 saat içinde tamamlanır.`,
        en: `Great news — you've completed the trading volume for your $${b} bonus, withdrawal is unlocked. Go to Assets > Withdraw to submit a request. If KYC is verified, processing takes 1-24 hours.`,
      };
      return okMsg[lang] || okMsg.en;
    }
    if (kycStatus && kycStatus !== 'verified') {
      const kycMsg: Record<string, string> = {
        tr: `Hesabınızda KYC durumunuz "${kycStatus}" — tam çekim hakları için doğrulamanızı tamamlamanız gerekiyor. Profile > Identity Verification bölümüne gidin, kimlik belgelerinizi yükleyin. Onay 1-3 iş günü içinde tamamlanır.`,
        en: `Your KYC status is "${kycStatus}" — full withdrawal access requires completing verification. Go to Profile > Identity Verification to upload your documents. Approval takes 1-3 business days.`,
        es: `Tu estado KYC es "${kycStatus}". Para retiros completos, completa la verificación en Profile > Identity Verification. Aprobación en 1-3 días hábiles.`,
        fr: `Votre statut KYC est "${kycStatus}". Pour les retraits complets, complétez la vérification dans Profile > Identity Verification. Approbation en 1-3 jours ouvrables.`,
        de: `Ihr KYC-Status ist "${kycStatus}". Für vollständige Auszahlungen vervollständigen Sie die Verifizierung unter Profile > Identity Verification. Genehmigung in 1-3 Werktagen.`,
        ru: `Ваш статус KYC: "${kycStatus}". Для полного вывода завершите верификацию в Profile > Identity Verification. Одобрение 1-3 рабочих дня.`,
        ar: `حالة KYC: "${kycStatus}". لإمكانية السحب الكاملة، أكمل التحقق في Profile > Identity Verification. الموافقة خلال 1-3 أيام عمل.`,
        zh: `您的 KYC 状态："${kycStatus}"。要完整提现权限，请在 Profile > Identity Verification 完成验证。审批 1-3 个工作日。`,
        pt: `Seu status KYC é "${kycStatus}". Para saques completos, conclua a verificação em Profile > Identity Verification. Aprovação em 1-3 dias úteis.`,
      };
      return kycMsg[lang] || kycMsg.en;
    }
    const lockedBalance = usdtBalance ? Number(usdtBalance.locked_balance || 0) : 0;
    if (lockedBalance > 0) {
      return isTr
        ? `Spot bakiyenizde $${lockedBalance.toFixed(2)} kilitli bakiye var (açık emirler veya pozisyonlar nedeniyle). Kullanılabilir bakiyenizi kontrol edin. ${responses.withdrawal_general}`
        : `You have $${lockedBalance.toFixed(2)} locked balance in your Spot wallet (due to open orders or positions). Check your available balance. ${responses.withdrawal_general}`;
    }
    return responses.withdrawal_general;
  }

  if (isDeposit) {
    const recentDeposits = lastTransactions.filter(t => (t.type as string)?.toLowerCase().includes('deposit'));
    if (recentDeposits.length > 0) {
      const latest = recentDeposits[0];
      const date = new Date(latest.created_at as string).toLocaleDateString(isTr ? 'tr-TR' : 'en-US');
      return isTr
        ? `Son para yatırma işleminiz ${date} tarihinde ${Number(latest.amount).toFixed(2)} ${latest.symbol} için görünüyor [${latest.status || 'işleniyor'}]. İşlem hâlâ görünmüyorsa TX Hash'inizi paylaşırsanız kontrol edebilirim.`
        : `Your last deposit transaction shows ${Number(latest.amount).toFixed(2)} ${latest.symbol} on ${date} [${latest.status || 'processing'}]. If it's still not showing, please share your TX Hash and I'll check it.`;
    }
    return responses.deposit_general;
  }

  if (isBalance) {
    const spotBalance = usdtBalance ? Number(usdtBalance.balance) : 0;
    const futuresBalance = usdtBalance ? Number(usdtBalance.futures_balance) : 0;
    const lockedBalance = usdtBalance ? Number(usdtBalance.locked_balance || 0) : 0;
    if (usdtBalance) {
      return isTr
        ? `Mevcut bakiyeleriniz: Spot USDT $${spotBalance.toFixed(2)} (kilitli: $${lockedBalance.toFixed(2)}), Futures USDT $${futuresBalance.toFixed(2)}. Beklenmedik bir eksiklik varsa TX Hash'inizi paylaşırsanız işlemlerinizi kontrol edebilirim.`
        : `Your current balances: Spot USDT $${spotBalance.toFixed(2)} (locked: $${lockedBalance.toFixed(2)}), Futures USDT $${futuresBalance.toFixed(2)}. If you see an unexpected discrepancy, share your TX Hash and I'll investigate.`;
    }
    return responses.balance_locked;
  }

  if (isSwap) return responses.eq_swap;
  if (isMining) return responses.mining_general;

  return null;
}

export function generateAIResponse(
  userMessage: string,
  context: ConversationContext
): string {
  const lang = context.customerLanguage;

  const personalizedResponse = getPersonalizedFinancialResponse(
    userMessage,
    lang,
    context.userContext,
    context.userProfile
  );
  if (personalizedResponse) return personalizedResponse;

  const generic = GENERIC_RESPONSES[lang] || GENERIC_RESPONSES['en'];
  return generic[Math.floor(Math.random() * generic.length)];
}

export function getTypingDelay(message: string): number {
  const base = 1200;
  const perChar = 22;
  const length = Math.min(message.length, 150);
  return base + length * perChar + Math.random() * 600;
}

export function getAgentFlagEmoji(agent: Agent): string {
  const code = (agent.country_code || '').toUpperCase();
  if (code.length !== 2) return '';
  return Array.from(code)
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('');
}

export function getAgentCountryLabel(agent: Agent): string {
  return agent.country_name || agent.region || '';
}
