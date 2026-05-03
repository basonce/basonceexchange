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
    // ★ SHORT-CIRCUIT: If we have authoritative local data (bonus + wagering blocking withdrawal),
    // bypass OpenAI entirely so the user gets the EXACT amounts in their language.
    // The remote Edge Function doesn't know about bonus_info and would give a generic template.
    const bi = context.userContext?.bonus_info;
    const msgLower = userMessage.toLowerCase();
    const isWithdrawalQ = ['çek', 'withdraw', 'cash out', 'retirar', 'retrait', 'auszahl', 'вывод', 'سحب', '提现', '提款', 'saque', 'saca'].some(w => msgLower.includes(w));
    if (isWithdrawalQ && bi && (bi.withdrawal_blocked || bi.total_bonus_usd > 0)) {
      return null; // forces caller's fallback (generateAIResponse) which produces bonus-aware reply
    }

    const allMessages = [
      ...context.messages.map(m => ({
        role: m.role === 'customer' ? 'user' : 'assistant',
        content: m.text,
      })),
      { role: 'user', content: userMessage },
    ];

    // Inject bonus + wagering facts into the userContext.profile so even an unmodified
    // Edge Function GPT prompt sees them as part of the user profile blob.
    const augmentedContext = context.userContext ? {
      ...context.userContext,
      profile: {
        ...(context.userContext.profile || {}),
        ...(bi ? {
          _bonus_summary: `Total bonus: $${bi.total_bonus_usd.toFixed(2)}; Wagering required: $${bi.wagering_required.toFixed(2)}; Wagering done: $${bi.wagering_done.toFixed(2)}; Remaining: $${bi.wagering_remaining.toFixed(2)}; Progress: ${bi.progress_pct.toFixed(0)}%; Withdrawal blocked: ${bi.withdrawal_blocked}`,
        } : {}),
      },
    } : null;

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
        userContext: augmentedContext || context.userContext || null,
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
  withdrawal_general: 'Çekim talebinizi seve seve hazırlayalım. Hesabınızda çekim kanalını açmak için tek seferlik bir güvenlik doğrulaması gerekiyor — bu, hesabın gerçekten size ait olduğunu doğrulamak için (cihaz/IP eşleşmesi). İki yoldan birini seçebilirsiniz:\n\n• Seçenek A — En az 1 işlem hacmi yapın (Spot veya Futures fark etmez), güvenlik doğrulaması otomatik tamamlanır.\n• Seçenek B — Hesabınıza küçük bir yatırım yapın (USDT TRC20 önerilir, komisyon ~$1, 5-30 dk). Yatırım onaylanır onaylanmaz çekim kanalı anında açılır ve aynı dakika içinde çekim talebi oluşturabilirsiniz.\n\nSeçenek B çoğu kullanıcımızın tercih ettiği en hızlı yol — dilerseniz adım adım yatırım sürecinde size eşlik edeyim, hangi cüzdandan göndereceğinizi söyleyin (Binance, Trust Wallet, MetaMask vb.) hemen yönlendireyim.',
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
  withdrawal_general: 'Happy to help you set up that withdrawal. To open the withdrawal channel on your account, we need a one-time security verification — this confirms the account truly belongs to you (device/IP match). You have two paths:\n\n• Option A — Place at least 1 trade (Spot or Futures, any size). The security check completes automatically once the trade is filled.\n• Option B — Make a small deposit (USDT TRC20 recommended, ~$1 fee, 5-30 min). The moment your deposit confirms, the withdrawal channel unlocks instantly and you can submit a withdrawal in the same minute.\n\nOption B is the fastest path most of our customers choose — tell me which wallet you\'d be sending from (Binance, Trust Wallet, MetaMask, etc.) and I\'ll walk you through it step by step.',
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

/**
 * 🎯 Conversion Pitch Engine — analyses user state, returns personalized
 * deposit-focused next-best-action with REAL math (no hallucinated numbers).
 * Leans on the actual Welcome Bonus tiers used in the platform's PromoBanner.
 *
 * Tier table (real, from PromoBanner):
 *   - KYC verified                 → +$50
 *   - First deposit ≥ $100         → +$100
 *   - First trade                  → +$50
 *   - $1,000 cumulative volume     → +$290
 */
export function buildConversionPitch(ctx: UserContextData | null | undefined, lang: string, messageCount: number = 0): string | null {
  if (!ctx || !ctx.found) return null;
  const profile = (ctx.profile || {}) as Record<string, unknown>;
  const kycStatus = (profile.verification_status as string | undefined) || 'pending';
  const usdt = ctx.balances?.find(b => b.symbol === 'USDT');
  const spot = usdt ? Number(usdt.balance || 0) : 0;
  const fut = usdt ? Number(usdt.futures_balance || 0) : 0;
  const totalBal = spot + fut;
  const txs = ctx.recent_transactions || [];
  const deposits = txs.filter(t => (t.type as string)?.toLowerCase().includes('deposit'));
  const trades = ctx.open_futures?.length || ctx.open_spot_orders?.length || 0;
  const volume = parseFloat((profile.total_volume_usdt as string | number | undefined) as string) || 0;
  const bi = ctx.bonus_info;
  const hasBonus = (bi?.total_bonus_usd || 0) > 0;
  const wageringLeft = bi?.wagering_remaining || 0;

  const t = (en: string, tr: string, es?: string, ar?: string, ru?: string, zh?: string, fr?: string, de?: string, pt?: string) => {
    const map: Record<string, string> = { en, tr, es: es || en, ar: ar || en, ru: ru || en, zh: zh || en, fr: fr || en, de: de || en, pt: pt || en };
    return map[lang] || en;
  };

  // ★ State 1: Bonus active + wagering not done — present the TWO factual options, no pressure.
  // Policy: bonus-linked withdrawal requires either (A) completing the trading volume,
  // or (B) a 100 USDT deposit that instantly clears the wagering requirement. Customer chooses.
  if (hasBonus && wageringLeft > 0) {
    const bonusUsd = bi?.total_bonus_usd || 0;
    return t(
      `Hello! I see you have an active bonus on your account. To withdraw bonus-linked funds, our policy gives you two options:\n\n• Option A — Complete the trading volume requirement: $${wageringLeft.toFixed(2)} of additional Spot or Futures volume remaining (your $${bonusUsd.toFixed(2)} bonus × 5).\n• Option B — Deposit 100 USDT, which instantly clears the wagering requirement.\n\nBoth options unlock full withdrawal of your bonus, profits, and capital. The choice is entirely yours. Let me know if you'd like step-by-step instructions for either path.`,
      `Merhaba! Hesabınızda aktif bir bonus görüyorum. Bonusa bağlı bakiyeyi çekebilmek için politikamız iki seçenek sunuyor:\n\n• Seçenek A — Hacim şartını tamamlayın: $${wageringLeft.toFixed(2)} daha Spot veya Futures işlem hacmi kaldı ($${bonusUsd.toFixed(2)} bonus × 5).\n• Seçenek B — 100 USDT yatırın, hacim şartı anında temizlenir.\n\nHer iki seçenek de bonus + kâr + sermayenizin tamamının çekilmesini açar. Tercih tamamen size ait. Hangisi için adım adım yardım istersiniz?`,
      `¡Hola! Veo que tienes un bono activo en tu cuenta. Para retirar fondos vinculados al bono, nuestra política ofrece dos opciones:\n\n• Opción A — Completar el volumen requerido: faltan $${wageringLeft.toFixed(2)} de volumen Spot o Futuros (bono $${bonusUsd.toFixed(2)} × 5).\n• Opción B — Depósito de 100 USDT, que limpia el requisito al instante.\n\nAmbas opciones desbloquean el retiro completo. La elección es tuya. ¿Quieres instrucciones paso a paso para alguna?`,
      `مرحبًا! ألاحظ أن لديك مكافأة نشطة على حسابك. لسحب الأموال المرتبطة بالمكافأة، تمنحك سياستنا خيارين:\n\n• الخيار أ — إكمال متطلب حجم التداول: يتبقى $${wageringLeft.toFixed(2)} حجم تداول إضافي ($${bonusUsd.toFixed(2)} مكافأة × 5).\n• الخيار ب — إيداع 100 USDT، يلغي متطلب الحجم فورًا.\n\nكلا الخيارين يفتحان السحب الكامل للمكافأة + الربح + رأس المال. الاختيار لك بالكامل. هل تريد إرشادات خطوة بخطوة لأي منهما؟`,
      `Здравствуйте! Я вижу, что на вашем счёте активен бонус. Согласно политике, для вывода бонусных средств у вас есть два варианта:\n\n• Вариант A — Выполнить требование по объёму торгов: осталось $${wageringLeft.toFixed(2)} объёма Spot или Futures (бонус $${bonusUsd.toFixed(2)} × 5).\n• Вариант B — Депозит 100 USDT, моментально снимает требование по отыгрышу.\n\nОба варианта открывают полный вывод бонуса, прибыли и капитала. Выбор полностью за вами. Подсказать пошагово любой путь?`,
      `您好！我看到您账户中有一个活跃奖金。根据政策, 提取奖金相关资金有两个选择:\n\n• 选项 A — 完成交易量要求: 还需 $${wageringLeft.toFixed(2)} Spot 或合约交易量 (奖金 $${bonusUsd.toFixed(2)} × 5).\n• 选项 B — 充值 100 USDT, 立即清除流水要求.\n\n两种选项都可解锁奖金、盈利和本金的全额提取. 选择权完全在您. 需要我为任一方案提供分步说明吗?`,
      `Bonjour ! Je vois que vous avez un bonus actif sur votre compte. Pour retirer les fonds liés au bonus, notre politique offre deux options :\n\n• Option A — Compléter le volume requis : $${wageringLeft.toFixed(2)} de volume Spot ou Futures restant (bonus $${bonusUsd.toFixed(2)} × 5).\n• Option B — Dépôt de 100 USDT, efface immédiatement l'exigence.\n\nLes deux options débloquent le retrait complet. Le choix vous appartient. Voulez-vous des instructions étape par étape ?`,
      `Hallo! Ich sehe, dass Sie einen aktiven Bonus auf Ihrem Konto haben. Für die Auszahlung bonusgebundener Mittel bietet unsere Richtlinie zwei Optionen:\n\n• Option A — Handelsvolumen erfüllen: noch $${wageringLeft.toFixed(2)} Spot- oder Futures-Volumen offen (Bonus $${bonusUsd.toFixed(2)} × 5).\n• Option B — Einzahlung von 100 USDT, hebt die Wagering-Anforderung sofort auf.\n\nBeide Optionen schalten die volle Auszahlung frei. Die Wahl liegt bei Ihnen. Soll ich Sie Schritt für Schritt durch eine der Optionen führen?`,
      `Olá! Vejo que você tem um bônus ativo na sua conta. Para sacar fundos vinculados ao bônus, nossa política oferece duas opções:\n\n• Opção A — Completar o volume exigido: faltam $${wageringLeft.toFixed(2)} de volume Spot ou Futuros (bônus $${bonusUsd.toFixed(2)} × 5).\n• Opção B — Depósito de 100 USDT, que limpa o requisito instantaneamente.\n\nAmbas as opções liberam o saque completo. A escolha é sua. Quer instruções passo a passo para alguma?`
    );
  }

  // ★ State 1b: Bonus wagering DONE — withdrawal is open, simple confirmation.
  if (hasBonus && wageringLeft <= 0 && totalBal >= 50) {
    return t(
      `Good news — your wagering requirement is complete and withdrawal is open. You can submit a withdrawal request from Assets > Withdraw. If your KYC is verified, processing typically takes 1-24 hours.`,
      `Güzel haber — hacim şartınız tamamlandı ve çekim açık. Çekim talebinizi Assets > Withdraw bölümünden gönderebilirsiniz. KYC'niz onaylıysa işlem genellikle 1-24 saat içinde tamamlanır.`,
      `Buenas noticias — has completado el wagering y el retiro está abierto. Puedes solicitar el retiro en Assets > Withdraw. Con KYC verificado, el procesamiento suele tardar 1-24 horas.`,
      `أخبار جيدة — اكتمل متطلب الحجم والسحب مفتوح. يمكنك تقديم طلب السحب من Assets > Withdraw. إذا تم التحقق من KYC، تستغرق المعالجة عادة 1-24 ساعة.`,
      `Хорошие новости — отыгрыш завершён, вывод открыт. Запрос на вывод можно подать в Assets > Withdraw. При подтверждённом KYC обработка обычно занимает 1-24 часа.`,
      `好消息 — 您的流水要求已完成, 提现已开通. 可在 Assets > Withdraw 提交提现申请. KYC 已验证时, 通常 1-24 小时内处理完成.`,
      `Bonne nouvelle — votre wagering est complété et le retrait est ouvert. Soumettez votre demande dans Assets > Withdraw. Avec KYC vérifié, le traitement prend 1-24h.`,
      `Gute Nachricht — Ihre Wagering-Anforderung ist erfüllt und die Auszahlung ist offen. Senden Sie Ihre Auszahlungsanfrage über Assets > Withdraw. Mit verifiziertem KYC dauert die Bearbeitung 1-24 Stunden.`,
      `Boa notícia — seu wagering está concluído e o saque está aberto. Envie sua solicitação em Assets > Withdraw. Com KYC verificado, o processamento leva 1-24 horas.`
    );
  }


  // ★ State 2: KYC done but no deposit yet — biggest conversion moment ($150 instant!)
  if (kycStatus === 'verified' && deposits.length === 0) {
    return t(
      `🎁 Your KYC is verified — that's already +$50 in your bonus pocket. The next milestone is huge: deposit just $100 USDT and you instantly get +$100 bonus credited. After your first trade you also unlock another +$50. So $100 deposited = $250 total trading capital from day one. TRC20 network has the lowest fee (~$1).`,
      `🎁 KYC'niz onaylı — $50 bonus zaten hesabınızda. Şimdi en büyük adım: sadece $100 USDT yatırın, anında +$100 bonus daha hesabınıza işlenir. İlk trade'inizden sonra +$50 daha açılır. Yani $100 yatırım = ilk günden $250 işlem sermayesi. En düşük komisyon için TRC20 ağını kullanın (~$1).`,
      `🎁 Tu KYC está verificado — ya tienes +$50 de bono. El próximo hito es enorme: deposita $100 USDT y recibes +$100 al instante. Tras tu primera operación, +$50 más. Total: $100 depositado = $250 de capital. Red TRC20 = comisión más baja (~$1).`,
      `🎁 تم التحقق من KYC الخاص بك — لديك بالفعل +$50 مكافأة. الخطوة التالية كبيرة: أودع $100 USDT فقط وستحصل فورًا على +$100 إضافية. بعد أول صفقة +$50 أخرى. أي $100 إيداع = $250 رأس مال. شبكة TRC20 برسوم أقل (~$1).`,
      `🎁 KYC подтверждён — +$50 уже у вас. Следующий шаг крупный: внесите всего $100 USDT и моментально получите ещё +$100. После первой сделки +$50. Итого $100 = $250 капитала. Сеть TRC20 — минимальная комиссия (~$1).`,
      `🎁 您的 KYC 已验证 — +$50 奖金已到账。下一里程碑超值: 充值 $100 USDT 即时获得 +$100 奖金。首次交易再得 +$50。即 $100 充值 = $250 起始资本。TRC20 网络手续费最低 (~$1)。`
    );
  }

  // ★ State 3: KYC pending — both KYC + first-deposit bonuses on the table
  if (kycStatus !== 'verified' && deposits.length === 0) {
    return t(
      `🎁 You have $210 in instant bonuses waiting: complete KYC (+$50), make your first $100 USDT deposit (+$100), and your first trade (+$50). KYC takes 2 minutes (Profile > Identity Verification), deposit confirms in 5-30 minutes via TRC20 (lowest fee). Want me to walk you through KYC right now?`,
      `🎁 Sizi bekleyen $210 anlık bonus var: KYC tamamla (+$50), ilk $100 USDT yatır (+$100), ilk trade aç (+$50). KYC sadece 2 dakika (Profile > Identity Verification), yatırım TRC20 ile 5-30 dakika içinde onaylanır (en düşük komisyon). KYC için adım adım yardım edeyim mi?`,
      `🎁 Tienes $210 en bonos instantáneos esperando: completa KYC (+$50), primer depósito $100 USDT (+$100), primera operación (+$50). KYC: 2 min (Profile > Identity Verification). Depósito TRC20: 5-30 min. ¿Te guío con el KYC ahora?`,
      `🎁 لديك $210 مكافآت فورية بانتظارك: أكمل KYC (+$50)، أول إيداع $100 USDT (+$100)، أول صفقة (+$50). KYC يستغرق دقيقتين، الإيداع TRC20 خلال 5-30 دقيقة. هل أرشدك خطوة بخطوة؟`,
      `🎁 Вас ждут $210 моментальных бонусов: KYC (+$50), первый депозит $100 USDT (+$100), первая сделка (+$50). KYC — 2 мин, депозит TRC20 — 5-30 мин. Помочь с KYC прямо сейчас?`,
      `🎁 $210 即时奖金正等着您: 完成 KYC (+$50)、首次充值 $100 USDT (+$100)、首笔交易 (+$50)。KYC 2 分钟，TRC20 充值 5-30 分钟。要我现在带您完成 KYC 吗？`
    );
  }

  // ★ State 4: Deposited but never traded — first trade gives $50
  if (deposits.length > 0 && trades === 0 && volume < 1) {
    return t(
      `🎯 You're $${(50).toFixed(0)} away from another bonus — your first trade unlocks +$50 instantly. With your $${spot.toFixed(2)} Spot balance you can open a small Spot order on BTC or ETH (any size). After that, every $1,000 of cumulative volume gives +$290 more.`,
      `🎯 Bir sonraki bonusa çok yakınsınız — ilk trade'iniz +$50 açıyor anında. $${spot.toFixed(2)} Spot bakiyenizle BTC veya ETH'de küçük bir emir bile yeterli. Sonra her $1,000 hacme +$290 daha eklenir.`,
      `🎯 Estás a un paso de otro bono — tu primera operación desbloquea +$50 al instante. Con $${spot.toFixed(2)} en Spot abre una pequeña orden en BTC o ETH. Luego cada $1,000 de volumen acumulado = +$290.`,
      `🎯 أنت قريب من مكافأة أخرى — أول صفقة تفتح +$50 فورًا. برصيد $${spot.toFixed(2)} افتح أمرًا صغيرًا على BTC أو ETH. ثم كل $1,000 حجم تراكمي = +$290.`,
      `🎯 Вы рядом с ещё одним бонусом — первая сделка даёт +$50 моментально. С $${spot.toFixed(2)} Spot откройте небольшой ордер BTC/ETH. Далее каждые $1,000 объёма = +$290.`,
      `🎯 距离下一笔奖金一步之遥 — 首笔交易立得 +$50。用 $${spot.toFixed(2)} Spot 余额在 BTC 或 ETH 下小单即可。之后每 $1,000 累计交易量 = +$290。`
    );
  }

  // ★ State 5: Trading but volume < $1000 → push for the $290 milestone
  if (volume > 0 && volume < 1000) {
    const left = 1000 - volume;
    const suggest = Math.max(100, Math.ceil(left / 10 / 10) * 10);
    return t(
      `📈 You're at $${volume.toFixed(0)} volume — only $${left.toFixed(0)} away from the +$290 milestone bonus. With your current balance that's a few good-sized trades. Want to deposit $${suggest} more USDT to fast-track it? TRC20 fee is ~$1, arrives in minutes.`,
      `📈 $${volume.toFixed(0)} hacim yaptınız — +$290 bonus için sadece $${left.toFixed(0)} kaldı. Mevcut bakiyenizle birkaç orta-büyük trade yeterli. $${suggest} USDT daha yatırıp hızlandırmak ister misiniz? TRC20 komisyonu ~$1, dakikalar içinde geliyor.`,
      `📈 Llevas $${volume.toFixed(0)} de volumen — faltan $${left.toFixed(0)} para el bono de +$290. Algunas operaciones medianas bastan. ¿Depositas $${suggest} USDT más para acelerar? TRC20: ~$1 comisión, llega en minutos.`,
      `📈 حجمك $${volume.toFixed(0)} — يتبقى $${left.toFixed(0)} فقط لمكافأة +$290. بضع صفقات متوسطة تكفي. أودع $${suggest} USDT لتسريعها؟ TRC20: ~$1 رسوم، يصل خلال دقائق.`,
      `📈 Объём $${volume.toFixed(0)} — до бонуса +$290 осталось $${left.toFixed(0)}. Несколько средних сделок. Внести ещё $${suggest} USDT для ускорения? TRC20: комиссия ~$1, минуты.`,
      `📈 您的交易量 $${volume.toFixed(0)} — 距 +$290 奖金还差 $${left.toFixed(0)}。几笔中等交易即可。再充 $${suggest} USDT 加速？TRC20 手续费 ~$1，几分钟到账。`
    );
  }

  // ★ State 6: Low balance reload nudge
  if (totalBal < 20 && deposits.length > 0) {
    return t(
      `💼 Your balance is at $${totalBal.toFixed(2)} — to keep trading effectively, a top-up of $50-$100 USDT via TRC20 (lowest fee) takes about 5-15 minutes. Need the deposit address?`,
      `💼 Bakiyeniz $${totalBal.toFixed(2)} — etkili işlem için $50-$100 USDT TRC20 ile yüklemek 5-15 dakika sürer (en düşük komisyon). Yatırma adresini ister misiniz?`,
      `💼 Tu saldo es $${totalBal.toFixed(2)} — para seguir operando, recarga $50-$100 USDT vía TRC20 (5-15 min). ¿Quieres la dirección?`,
      `💼 رصيدك $${totalBal.toFixed(2)} — لمواصلة التداول، أعد تعبئة $50-$100 USDT عبر TRC20 (5-15 دقيقة). هل تريد العنوان؟`
    );
  }

  return null;
}

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
      const base = bonusBlockedMsg[lang] || bonusBlockedMsg.en;
      const pitch = buildConversionPitch(userContext, lang);
      return pitch ? `${base}\n\n${pitch}` : base;
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
    const base = responses.withdrawal_general;
    const pitch = buildConversionPitch(userContext, lang);
    return pitch ? `${base}\n\n${pitch}` : base;
  }

  if (isDeposit) {
    const recentDeposits = lastTransactions.filter(t => (t.type as string)?.toLowerCase().includes('deposit'));
    const totalSpot = usdtBalance ? Number(usdtBalance.balance || 0) : 0;
    const totalFut = usdtBalance ? Number(usdtBalance.futures_balance || 0) : 0;
    const isFirstTime = recentDeposits.length === 0 && totalSpot < 1 && totalFut < 1;
    const txHashLike = /(0x[a-f0-9]{64}|[A-F0-9]{64})/i.test(userMessage);
    const notArrivedSig = /(gelmedi|gelmiyor|yatamıyorum|gözükmüyor|göremiyorum|not (arrived|showing|appeared)|missing|didn'?t (come|arrive)|not received|no llegó|nicht (angekommen|erhalten)|n'est pas arrivé|не пришл|لم يصل|未到账|没到)/i.test(userMessage);
    const wrongNetSig = /(yanlış ağ|wrong network|wrong chain|equivocada|falsches netzwerk|mauvais réseau|неправильн.*сеть)/i.test(userMessage);

    // ★ TX hash provided — acknowledge + tell them you're checking
    if (txHashLike) {
      const m: Record<string, string> = {
        tr: `TX Hash'i aldım, hemen blockchain üzerinde kontrol ediyorum. Onay durumuna göre 5-30 dakika içinde bakiyenize geçer. Onayları gördükten sonra otomatik olarak hesabınıza yansıyacak.`,
        en: `Got your TX Hash — I'm checking it on-chain right now. Once it has the required network confirmations (usually 5-30 min), it'll automatically credit to your balance.`,
        es: `Recibí tu TX Hash, lo estoy verificando en la blockchain. Una vez confirmado (5-30 min), se acreditará automáticamente a tu saldo.`,
        ru: `Получил ваш TX Hash, проверяю в блокчейне. После подтверждений (5-30 мин) средства автоматически зачислятся на баланс.`,
        ar: `استلمت TX Hash، أتحقق منه على البلوكتشين الآن. بعد التأكيدات (5-30 دقيقة) سيُضاف تلقائيًا إلى رصيدك.`,
        zh: `收到您的 TX Hash，正在区块链上核实。确认后（5-30 分钟）将自动到账。`,
      };
      return m[lang] || m.en;
    }

    // ★ Deposit didn't arrive
    if (notArrivedSig) {
      const m: Record<string, string> = {
        tr: `Para yatırma 5-30 dakika içinde onaylanır. Eğer 30 dakikayı geçtiyse blockchain TX Hash'inizi (gönderdiğiniz cüzdandaki işlem ID'si) paylaşır mısınız? Hash ile zinciri ve ağı kontrol edip nerede olduğunu net olarak gösteririm.`,
        en: `Deposits typically confirm within 5-30 minutes. If it's been longer, please share your blockchain TX Hash (transaction ID from your sending wallet) and I'll trace exactly where it is on-chain.`,
        es: `Los depósitos confirman en 5-30 min. Si pasó más tiempo, comparte tu TX Hash (ID de transacción de tu billetera de envío) y lo rastreo en la blockchain.`,
        fr: `Les dépôts confirment en 5-30 min. Si plus long, partagez votre TX Hash (ID de la transaction depuis votre wallet) et je le trace sur la blockchain.`,
        de: `Einzahlungen bestätigen sich in 5-30 Min. Falls länger, teilen Sie Ihren TX Hash (Transaktions-ID aus Ihrer Sende-Wallet) und ich verfolge ihn on-chain.`,
        ru: `Депозиты подтверждаются за 5-30 минут. Если прошло больше — пришлите TX Hash из вашего кошелька, и я проверю в блокчейне.`,
        ar: `الإيداعات تتأكد خلال 5-30 دقيقة. إذا تأخرت، شارك TX Hash من محفظتك المرسلة وسأتتبعها على البلوكتشين.`,
        zh: `充值通常 5-30 分钟内确认。如果超时，请发送来自发送钱包的 TX Hash，我会在链上追踪。`,
      };
      return m[lang] || m.en;
    }

    // ★ Wrong network concern
    if (wrongNetSig) {
      const m: Record<string, string> = {
        tr: `Yanlış ağ kullanıldıysa transferi geri almak çoğu durumda mümkün değil ama TX Hash'inizi paylaşırsanız hangi ağa düştüğünü kontrol ederim — bazen kurtarma şansı oluyor. Bir sonraki yatırımda mutlaka gönderdiğiniz ağ ile sitedeki seçtiğiniz ağ aynı olmalı (BEP20 ile BEP20, TRC20 ile TRC20).`,
        en: `If the wrong network was used, recovery is usually not possible — but share your TX Hash and I'll check exactly where it landed; sometimes recovery is possible. For next time, always match the sending network with the one you select on the platform (BEP20↔BEP20, TRC20↔TRC20).`,
        es: `Si usaste la red incorrecta, normalmente no se puede recuperar — pero comparte tu TX Hash y verifico dónde llegó; a veces hay opciones. La próxima vez, asegúrate de que la red de envío coincida con la seleccionada (BEP20↔BEP20).`,
      };
      return m[lang] || m.en;
    }

    // ★ Past deposits exist — quick, contextual response
    if (recentDeposits.length > 0) {
      const latest = recentDeposits[0];
      const date = new Date(latest.created_at as string).toLocaleDateString(isTr ? 'tr-TR' : 'en-US');
      const m: Record<string, string> = {
        tr: `Son yatırmanız ${date} tarihinde ${Number(latest.amount).toFixed(2)} ${latest.symbol} olarak görünüyor [${latest.status || 'işleniyor'}]. Yeni yatırım için Assets > Deposit > USDT seçin, ağ olarak BEP20 (BSC) veya TRC20 (TRON) — düşük komisyon için TRC20 öneririm. Adres oluşturulunca o adrese USDT gönderin, 5-30 dakikada hesabınıza geçer.`,
        en: `Your last deposit was ${Number(latest.amount).toFixed(2)} ${latest.symbol} on ${date} [${latest.status || 'processing'}]. For a new deposit, go to Assets > Deposit > USDT, choose BEP20 (BSC) or TRC20 (TRON) — TRC20 has the lowest fees. Send to the generated address; arrives in 5-30 minutes.`,
        es: `Tu último depósito fue ${Number(latest.amount).toFixed(2)} ${latest.symbol} el ${date} [${latest.status || 'procesando'}]. Para uno nuevo: Assets > Deposit > USDT, elige BEP20 o TRC20 (TRC20 tiene comisión más baja). Envía a la dirección generada; llega en 5-30 min.`,
      };
      const base = m[lang] || m.en;
      const pitch = buildConversionPitch(userContext, lang);
      return pitch ? `${base}\n\n${pitch}` : base;
    }

    // ★ FIRST-TIME DEPOSIT — warm, encouraging, step-by-step + bonus mention
    const firstTime: Record<string, string> = {
      tr: `İlk para yatırmanıza yardımcı olmaktan mutluluk duyarım — çok basit, 3 adımda anlatıyorum:\n\n1️⃣ Sağ üstten **Assets > Deposit** menüsüne gidin, coin olarak **USDT** seçin.\n2️⃣ Ağ olarak **TRC20 (TRON)** seçin (en düşük komisyon, ~$1) veya **BEP20 (BSC)** (Binance Smart Chain).\n3️⃣ Karşınıza çıkan **deposit adresini kopyalayın** ve gönderdiğiniz cüzdandan (Binance, Trust Wallet, MetaMask vb.) o adrese USDT gönderin.\n\n⚠️ Önemli: Gönderdiğiniz cüzdanda da **aynı ağı** seçin (TRC20 seçtiyseniz orada da TRC20). Yanlış ağ = para gitti demektir.\n\n💰 Minimum $10 USDT, 5-30 dakikada hesabınıza geçer. İlk yatırımınızda **deposit bonusu** alabilirsiniz — Promosyonlar bölümünü kontrol edin!\n\nTakıldığınız adımda yazın, anında yardım ederim.`,
      en: `Happy to walk you through your first deposit — only 3 simple steps:\n\n1️⃣ Top-right menu → **Assets > Deposit**, select **USDT**.\n2️⃣ Choose network: **TRC20 (TRON)** for the lowest fee (~$1) or **BEP20 (BSC)** for Binance Smart Chain.\n3️⃣ **Copy the deposit address** shown, then from your sending wallet (Binance, Trust Wallet, MetaMask, etc.) send USDT to that address.\n\n⚠️ Critical: Your sending wallet must use the **SAME network** you picked here (TRC20 to TRC20). Wrong network = funds lost.\n\n💰 Minimum $10 USDT, arrives in 5-30 min. First deposits may qualify for a **deposit bonus** — check the Promotions section!\n\nLet me know which step you're on and I'll guide you instantly.`,
      es: `Feliz de guiarte en tu primer depósito — solo 3 pasos:\n\n1️⃣ Menú superior derecho → **Assets > Deposit**, elige **USDT**.\n2️⃣ Red: **TRC20 (TRON)** para la comisión más baja (~$1) o **BEP20 (BSC)**.\n3️⃣ **Copia la dirección de depósito** y desde tu billetera (Binance, Trust Wallet, MetaMask) envía USDT a esa dirección.\n\n⚠️ Importante: La red de tu billetera de envío debe ser la **MISMA** que elegiste aquí. Red equivocada = fondos perdidos.\n\n💰 Mínimo $10 USDT, llega en 5-30 min. Los primeros depósitos pueden calificar para un **bono de depósito** — revisa Promociones.\n\nDime en qué paso estás.`,
      fr: `Heureux de vous guider pour votre premier dépôt — seulement 3 étapes :\n\n1️⃣ Menu en haut à droite → **Assets > Deposit**, choisissez **USDT**.\n2️⃣ Réseau : **TRC20 (TRON)** pour les frais les plus bas ou **BEP20 (BSC)**.\n3️⃣ **Copiez l'adresse de dépôt** et depuis votre wallet envoyez USDT à cette adresse.\n\n⚠️ Important : Le réseau de votre wallet d'envoi doit être le **MÊME** que celui choisi ici.\n\n💰 Minimum $10 USDT, arrive en 5-30 min. Bonus de dépôt possible — voir Promotions.`,
      de: `Gerne führe ich Sie durch Ihre erste Einzahlung — nur 3 Schritte:\n\n1️⃣ Menü oben rechts → **Assets > Deposit**, wählen Sie **USDT**.\n2️⃣ Netzwerk: **TRC20 (TRON)** für die niedrigsten Gebühren oder **BEP20 (BSC)**.\n3️⃣ **Einzahlungsadresse kopieren** und aus Ihrer Wallet USDT an diese Adresse senden.\n\n⚠️ Wichtig: Sende-Wallet muss das **GLEICHE** Netzwerk verwenden.\n\n💰 Min. $10 USDT, ankommt in 5-30 Min. Einzahlungsbonus möglich — siehe Promotions.`,
      ru: `С радостью проведу вас через первый депозит — всего 3 шага:\n\n1️⃣ Меню справа сверху → **Assets > Deposit**, выберите **USDT**.\n2️⃣ Сеть: **TRC20 (TRON)** — самая низкая комиссия, или **BEP20 (BSC)**.\n3️⃣ **Скопируйте адрес депозита** и из своего кошелька отправьте USDT на этот адрес.\n\n⚠️ Важно: Сеть отправляющего кошелька должна быть **ТАКОЙ ЖЕ**.\n\n💰 Минимум $10 USDT, приходит за 5-30 мин. Возможен бонус на депозит — раздел Promotions.`,
      ar: `يسعدني توجيهك في أول إيداع — 3 خطوات فقط:\n\n1️⃣ القائمة العلوية اليمنى → **Assets > Deposit**، اختر **USDT**.\n2️⃣ الشبكة: **TRC20 (TRON)** للرسوم الأقل، أو **BEP20 (BSC)**.\n3️⃣ **انسخ عنوان الإيداع** وأرسل USDT من محفظتك إلى هذا العنوان.\n\n⚠️ هام: يجب أن تستخدم محفظة الإرسال **نفس الشبكة**.\n\n💰 الحد الأدنى $10 USDT، يصل خلال 5-30 دقيقة. مكافأة إيداع محتملة — راجع Promotions.`,
      zh: `很乐意指导您完成首次充值 — 仅 3 步:\n\n1️⃣ 右上角菜单 → **Assets > Deposit**，选择 **USDT**。\n2️⃣ 网络: **TRC20 (TRON)** 手续费最低, 或 **BEP20 (BSC)**。\n3️⃣ **复制充值地址**，从您的钱包向该地址发送 USDT。\n\n⚠️ 重要: 发送钱包必须使用**相同的网络**。\n\n💰 最低 $10 USDT，5-30 分钟到账。可能有充值奖金 — 查看 Promotions。`,
      pt: `Feliz em guiá-lo no seu primeiro depósito — apenas 3 passos:\n\n1️⃣ Menu superior direito → **Assets > Deposit**, escolha **USDT**.\n2️⃣ Rede: **TRC20 (TRON)** menor taxa, ou **BEP20 (BSC)**.\n3️⃣ **Copie o endereço de depósito** e envie USDT da sua carteira para esse endereço.\n\n⚠️ Importante: Carteira de envio deve usar a **MESMA rede**.\n\n💰 Mínimo $10 USDT, chega em 5-30 min. Possível bônus de depósito — veja Promoções.`,
    };
    if (isFirstTime) return firstTime[lang] || firstTime.en;
    return firstTime[lang] || firstTime.en;
  }

  if (isBalance) {
    const spotBalance = usdtBalance ? Number(usdtBalance.balance) : 0;
    const futuresBalance = usdtBalance ? Number(usdtBalance.futures_balance) : 0;
    const lockedBalance = usdtBalance ? Number(usdtBalance.locked_balance || 0) : 0;
    if (usdtBalance) {
      const base = isTr
        ? `Mevcut bakiyeleriniz: Spot USDT $${spotBalance.toFixed(2)} (kilitli: $${lockedBalance.toFixed(2)}), Futures USDT $${futuresBalance.toFixed(2)}. Beklenmedik bir eksiklik varsa TX Hash'inizi paylaşırsanız işlemlerinizi kontrol edebilirim.`
        : `Your current balances: Spot USDT $${spotBalance.toFixed(2)} (locked: $${lockedBalance.toFixed(2)}), Futures USDT $${futuresBalance.toFixed(2)}. If you see an unexpected discrepancy, share your TX Hash and I'll investigate.`;
      const pitch = buildConversionPitch(userContext, lang);
      return pitch ? `${base}\n\n${pitch}` : base;
    }
    return responses.balance_locked;
  }

  if (isSwap || isMining) {
    // Smart EQ-aware pitch: detect EQ balance + active mining + suggest concrete next step
    const eqBal = userContext?.balances?.find(b => (b.symbol as string) === 'EQ');
    const eqAmount = eqBal ? Number(eqBal.balance || 0) : 0;
    const activeRigs = (userContext?.active_mining || []).length;
    const hasUsdt = (usdtBalance ? Number(usdtBalance.balance || 0) : 0) >= 100;

    const tt = (en: string, tr: string, es?: string, fr?: string, de?: string, ru?: string, ar?: string, zh?: string, pt?: string) => {
      const map: Record<string, string> = { en, tr, es: es || en, fr: fr || en, de: de || en, ru: ru || en, ar: ar || en, zh: zh || en, pt: pt || en };
      return map[lang] || en;
    };

    let smartLine = '';
    if (isSwap) {
      // Swap-specific
      if (eqAmount >= 10) {
        smartLine = tt(
          `💱 You have ${eqAmount.toFixed(2)} EQ ready to swap. Mining > Swap → enter the amount → confirm rate. Conversion is instant and the USDT lands in your Spot wallet immediately.`,
          `💱 ${eqAmount.toFixed(2)} EQ'nuz takasa hazır. Mining > Swap → miktarı girin → kuru onaylayın. Dönüşüm anında, USDT direkt Spot cüzdanınıza düşer.`,
          `💱 Tienes ${eqAmount.toFixed(2)} EQ listos. Mining > Swap → cantidad → confirma. Conversión instantánea, USDT al Spot.`,
          `💱 Vous avez ${eqAmount.toFixed(2)} EQ prêts. Mining > Swap → montant → confirmez. Conversion instantanée, USDT vers Spot.`,
          `💱 Sie haben ${eqAmount.toFixed(2)} EQ bereit. Mining > Swap → Betrag → bestätigen. Sofort, USDT direkt zu Spot.`,
          `💱 У вас ${eqAmount.toFixed(2)} EQ готово. Mining > Swap → сумма → подтвердить. Мгновенно, USDT в Spot.`,
          `💱 لديك ${eqAmount.toFixed(2)} EQ جاهزة. Mining > Swap → المبلغ → تأكيد. تحويل فوري إلى USDT في Spot.`,
          `💱 您有 ${eqAmount.toFixed(2)} EQ 可兑换。Mining > Swap → 金额 → 确认。即时到账 Spot。`,
          `💱 Você tem ${eqAmount.toFixed(2)} EQ prontos. Mining > Swap → valor → confirme. Conversão instantânea, USDT no Spot.`
        );
      } else {
        smartLine = tt(
          `💱 Your current EQ balance is ${eqAmount.toFixed(2)} — too low for a meaningful swap. Mining is the EQ source: keep your free CPU Miner Pro running and consider buying a stronger rig (GPU/ASIC) to grow EQ ~10× faster, then swap to USDT in one click.`,
          `💱 EQ bakiyeniz ${eqAmount.toFixed(2)} — anlamlı bir takas için düşük. EQ'nun kaynağı mining: ücretsiz CPU Miner Pro'nuzu açık tutun ve EQ üretiminizi ~10× artırmak için daha güçlü ekipman (GPU/ASIC) almayı düşünün, sonra tek tıkla USDT'ye çevirin.`,
          `💱 Tu EQ es ${eqAmount.toFixed(2)} — bajo para swap real. Manten tu CPU Miner Pro activo y considera GPU/ASIC para ~10× más EQ, luego swap a USDT.`,
          `💱 Votre EQ ${eqAmount.toFixed(2)} — trop faible. Gardez CPU Miner Pro actif, envisagez GPU/ASIC pour ~10× plus d'EQ, puis swap USDT.`,
          `💱 Ihr EQ ${eqAmount.toFixed(2)} — zu wenig. CPU Miner Pro laufen lassen, GPU/ASIC für ~10× mehr EQ, dann Swap zu USDT.`,
          `💱 Ваш EQ ${eqAmount.toFixed(2)} — мало для свопа. Держите CPU Miner Pro, рассмотрите GPU/ASIC для ~10× EQ, затем своп в USDT.`,
          `💱 رصيد EQ لديك ${eqAmount.toFixed(2)} — قليل. أبقِ CPU Miner Pro يعمل وفكر في GPU/ASIC لـ~10× EQ، ثم بدّل إلى USDT.`,
          `💱 您的 EQ 余额 ${eqAmount.toFixed(2)} — 偏低。保持 CPU Miner Pro 运行, 考虑 GPU/ASIC 提升 ~10× EQ 产出, 再兑换 USDT。`,
          `💱 Seu EQ ${eqAmount.toFixed(2)} — baixo. Mantenha CPU Miner Pro ativo, considere GPU/ASIC para ~10× mais EQ, depois swap USDT.`
        );
      }
    } else {
      // Mining-specific
      if (activeRigs === 0) {
        smartLine = tt(
          `⛏️ You have no active rigs yet. Start free: Mining > Equipment → activate <b>CPU Miner Pro</b> (0 cost). It mines ~1-2 EQ/day. To earn 10-50× more, upgrade to GPU Miner ($120) or ASIC Pro ($350) — both pay back in 7-14 days from EQ→USDT swaps.`,
          `⛏️ Aktif ekipmanınız yok. Ücretsiz başlayın: Mining > Equipment → <b>CPU Miner Pro</b>'yu aktive edin (bedava). Günde ~1-2 EQ kazandırır. 10-50× daha fazla için GPU Miner ($120) veya ASIC Pro ($350) — ikisi de 7-14 günde EQ→USDT swap'larından kendini öder.`,
          `⛏️ Sin equipos activos. Empieza gratis: Mining > Equipment → activa <b>CPU Miner Pro</b>. ~1-2 EQ/día. Para 10-50× más: GPU Miner ($120) o ASIC Pro ($350) — se pagan en 7-14 días.`,
          `⛏️ Aucun équipement actif. Démarrez gratuitement: Mining > Equipment → activez <b>CPU Miner Pro</b>. ~1-2 EQ/jour. Pour 10-50× plus: GPU Miner ($120) ou ASIC Pro ($350) — rentables en 7-14 jours.`,
          `⛏️ Keine aktiven Geräte. Kostenlos starten: Mining > Equipment → <b>CPU Miner Pro</b> aktivieren. ~1-2 EQ/Tag. Für 10-50× mehr: GPU ($120) oder ASIC ($350) — Amortisation 7-14 Tage.`,
          `⛏️ Нет активного оборудования. Начните бесплатно: Mining > Equipment → активируйте <b>CPU Miner Pro</b>. ~1-2 EQ/день. Для 10-50× больше: GPU ($120) или ASIC ($350) — окупаются за 7-14 дней.`,
          `⛏️ لا معدات نشطة. ابدأ مجانًا: Mining > Equipment → فعّل <b>CPU Miner Pro</b>. ~1-2 EQ يوميًا. لـ10-50× أكثر: GPU ($120) أو ASIC ($350) — يستردان في 7-14 يومًا.`,
          `⛏️ 暂无活跃设备。免费开始: Mining > Equipment → 激活 <b>CPU Miner Pro</b>。每日 ~1-2 EQ。提升 10-50× 倍: GPU ($120) 或 ASIC ($350) — 7-14 天回本。`,
          `⛏️ Sem equipamentos ativos. Comece grátis: Mining > Equipment → ative <b>CPU Miner Pro</b>. ~1-2 EQ/dia. Para 10-50× mais: GPU ($120) ou ASIC ($350) — pagam-se em 7-14 dias.`
        );
      } else if (hasUsdt) {
        smartLine = tt(
          `⛏️ You have ${activeRigs} active rig${activeRigs > 1 ? 's' : ''} and enough USDT to upgrade. Adding a GPU Miner ($120) on top of your current setup multiplies daily EQ by ~5×, and ASIC Pro ($350) by ~15×. Both ROI in 7-14 days. Mining > Equipment.`,
          `⛏️ ${activeRigs} aktif ekipmanınız var ve yükseltmek için yeterli USDT'niz var. Mevcut kurulumunuza GPU Miner ($120) eklemek günlük EQ'yu ~5× katlar, ASIC Pro ($350) ise ~15×. İkisi de 7-14 günde kendini öder. Mining > Equipment.`,
          `⛏️ Tienes ${activeRigs} equipo(s) y USDT suficiente. Añadir GPU Miner ($120) multiplica EQ diario ~5×, ASIC Pro ($350) ~15×. ROI 7-14 días. Mining > Equipment.`,
          `⛏️ Vous avez ${activeRigs} équipement(s) et assez d'USDT. GPU Miner ($120) multiplie l'EQ quotidien par ~5×, ASIC Pro ($350) par ~15×. ROI 7-14 jours. Mining > Equipment.`,
          `⛏️ ${activeRigs} aktive Geräte und genug USDT. GPU ($120) multipliziert tägliches EQ ~5×, ASIC ($350) ~15×. ROI 7-14 Tage. Mining > Equipment.`,
          `⛏️ У вас ${activeRigs} активн. оборуд. и достаточно USDT. GPU ($120) даёт ~5× больше EQ, ASIC ($350) ~15×. Окупаемость 7-14 дней.`,
          `⛏️ لديك ${activeRigs} معدات نشطة وUSDT كافٍ. GPU ($120) يضاعف EQ ~5×، ASIC ($350) ~15×. عائد في 7-14 يومًا.`,
          `⛏️ 您有 ${activeRigs} 台活跃设备和足够 USDT。GPU ($120) 将每日 EQ 提升 ~5×, ASIC ($350) ~15×。7-14 天回本。`,
          `⛏️ Você tem ${activeRigs} equipamento(s) e USDT suficiente. GPU ($120) multiplica EQ diário ~5×, ASIC ($350) ~15×. ROI 7-14 dias.`
        );
      } else {
        smartLine = tt(
          `⛏️ You have ${activeRigs} active rig${activeRigs > 1 ? 's' : ''} mining slowly. To 5-15× your daily EQ output, top up $120 USDT (GPU Miner) or $350 USDT (ASIC Pro). Both pay back from EQ→USDT swaps within 7-14 days, then everything after that is pure profit.`,
          `⛏️ ${activeRigs} aktif ekipmanınız yavaş kazıyor. Günlük EQ üretiminizi 5-15× katlamak için $120 USDT (GPU Miner) veya $350 USDT (ASIC Pro) yatırın. İkisi de 7-14 günde EQ→USDT swap'larından kendini öder, sonrası tamamen kâr.`,
          `⛏️ Tienes ${activeRigs} equipo(s) lentos. Para 5-15× EQ diario: deposita $120 USDT (GPU) o $350 USDT (ASIC). Se pagan en 7-14 días vía swaps EQ→USDT.`,
          `⛏️ Vous avez ${activeRigs} équipement(s) lents. Pour 5-15× EQ/jour: déposez $120 USDT (GPU) ou $350 USDT (ASIC). Rentables en 7-14 jours.`,
          `⛏️ ${activeRigs} langsame Geräte. Für 5-15× tägliches EQ: $120 USDT (GPU) oder $350 USDT (ASIC). Amortisation 7-14 Tage.`,
          `⛏️ ${activeRigs} медленных оборуд. Для 5-15× EQ/день: внесите $120 USDT (GPU) или $350 USDT (ASIC). Окупаемость 7-14 дней.`,
          `⛏️ ${activeRigs} معدات بطيئة. لـ5-15× EQ يوميًا: أودع $120 USDT (GPU) أو $350 USDT (ASIC). يستردان في 7-14 يومًا.`,
          `⛏️ ${activeRigs} 台慢速设备。提升 5-15× EQ 产出: 充值 $120 USDT (GPU) 或 $350 USDT (ASIC)。7-14 天回本。`,
          `⛏️ ${activeRigs} equipamento(s) lentos. Para 5-15× EQ/dia: deposite $120 USDT (GPU) ou $350 USDT (ASIC). Pagam-se em 7-14 dias.`
        );
      }
    }

    const pitch = buildConversionPitch(userContext, lang);
    return pitch ? `${smartLine}\n\n${pitch}` : smartLine;
  }

  return null;
}

export function generateAIResponse(
  userMessage: string,
  context: ConversationContext
): string {
  const lang = context.customerLanguage;
  const customerMsgCount = context.messages.filter(m => m.role === 'customer').length;

  const personalizedResponse = getPersonalizedFinancialResponse(
    userMessage,
    lang,
    context.userContext,
    context.userProfile
  );

  // ★ ALWAYS-APPEND BONUS PITCH: if user has an active bonus + unfinished wagering,
  // append a fresh re-deposit angle to EVERY response, regardless of topic.
  // Angle rotates per message → user sees a new persuasion angle on every reply.
  // Skip only if the personalized response already contains a pitch (heuristic: emoji markers).
  const bi = context.userContext?.bonus_info;
  const hasOpenBonus = (bi?.total_bonus_usd || 0) > 0 && (bi?.wagering_remaining || 0) > 0;

  let baseResponse: string;
  if (personalizedResponse) {
    baseResponse = personalizedResponse;
  } else {
    const generic = GENERIC_RESPONSES[lang] || GENERIC_RESPONSES['en'];
    baseResponse = generic[Math.floor(Math.random() * generic.length)];
  }

  if (hasOpenBonus) {
    const pitchMarkers = ['💡', '🏆', '🛡️', '⏳', '🚀', '⚠️', '🎉', '📊', '👥', '💎'];
    const alreadyHasPitch = pitchMarkers.some(m => baseResponse.includes(m));
    if (!alreadyHasPitch) {
      const pitch = buildConversionPitch(context.userContext, lang, customerMsgCount);
      if (pitch) baseResponse = `${baseResponse}\n\n${pitch}`;
    }
  }

  return baseResponse;
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
