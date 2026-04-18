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
export function buildConversionPitch(ctx: UserContextData | null | undefined, lang: string): string | null {
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

  // ★ State 1: Bonus active + wagering not done — push deposit to FUEL the wagering
  if (hasBonus && wageringLeft > 0) {
    const depSuggest = Math.max(50, Math.ceil(wageringLeft / 10 / 10) * 10);
    return t(
      `💡 Pro tip: with $${spot.toFixed(2)} balance, completing $${wageringLeft.toFixed(0)} in volume takes time. If you deposit just $${depSuggest} more USDT, you can use bigger position sizes and finish the wagering in a few hours instead of days. Once it's done your $${(bi?.total_bonus_usd || 0).toFixed(0)} bonus + profits become fully withdrawable.`,
      `💡 İpucu: $${spot.toFixed(2)} bakiyenizle $${wageringLeft.toFixed(0)} hacim yapmak günler sürebilir. $${depSuggest} USDT daha yatırırsanız daha büyük pozisyonlarla bu hacmi birkaç saatte bitirir, $${(bi?.total_bonus_usd || 0).toFixed(0)} bonusunuz + kârınız tamamen çekilebilir hale gelir.`,
      `💡 Consejo: con $${spot.toFixed(2)} de saldo, completar $${wageringLeft.toFixed(0)} de volumen toma tiempo. Si depositas $${depSuggest} USDT más, puedes operar con posiciones mayores y terminar en horas. Tu bono de $${(bi?.total_bonus_usd || 0).toFixed(0)} + ganancias quedan totalmente retirables.`,
      `💡 نصيحة: برصيد $${spot.toFixed(2)}، إكمال حجم $${wageringLeft.toFixed(0)} يستغرق وقتًا. أودع $${depSuggest} USDT إضافية لتداول بأحجام أكبر وإنهاء المتطلب خلال ساعات. مكافأتك $${(bi?.total_bonus_usd || 0).toFixed(0)} + أرباحك قابلة للسحب بالكامل.`,
      `💡 Совет: с балансом $${spot.toFixed(2)} закрыть объём $${wageringLeft.toFixed(0)} долго. Внесите ещё $${depSuggest} USDT — крупнее позиции, быстрее выполнение. Бонус $${(bi?.total_bonus_usd || 0).toFixed(0)} + прибыль станут полностью выводимыми.`,
      `💡 提示: 当前余额 $${spot.toFixed(2)}, 完成 $${wageringLeft.toFixed(0)} 交易量需要时间。再充值 $${depSuggest} USDT 可用更大仓位, 几小时内完成。$${(bi?.total_bonus_usd || 0).toFixed(0)} 奖金 + 盈利全部可提。`
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
    const suggest = Math.max(50, Math.ceil(left / 10 / 10) * 10);
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
    return responses.withdrawal_general;
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

  if (isSwap) {
    const pitch = buildConversionPitch(userContext, lang);
    return pitch ? `${responses.eq_swap}\n\n${pitch}` : responses.eq_swap;
  }
  if (isMining) {
    const pitch = buildConversionPitch(userContext, lang);
    return pitch ? `${responses.mining_general}\n\n${pitch}` : responses.mining_general;
  }

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
