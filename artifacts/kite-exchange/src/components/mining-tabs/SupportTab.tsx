import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, MessageCircle, Cpu, Pickaxe, Gauge, DollarSign, HelpCircle, Shield, Clock, ArrowLeft, Send, Check, Lock } from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';
import { detectUserCountry } from '../../lib/geolocation';
import { assignBestAgent, type Agent } from '../../lib/agent-assignment';
import {
  verifyUserAndGetContext,
  enrichUserContextWithBonus,
  generateAIResponseFromOpenAI,
  generateAIResponse,
  analyzeUserProfile,
  getTypingDelay,
  type UserContextData,
} from '../../lib/ai-support-engine';

const _miningTicketsBeingReplied = new Set<string>();

function detectMsgLang(text: string): string {
  if (!text || text.trim().length < 2) return 'en';
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  if (/[çşğıöüÇŞĞİÖÜ]/.test(text)) return 'tr';
  if (/\b(merhaba|selam|nasıl|yardım|teşekkür|sorun|para|çekim)\b/i.test(text)) return 'tr';
  if (/[äöüßÄÖÜ]/.test(text)) return 'de';
  if (/\b(hallo|danke|bitte|hilfe)\b/i.test(text)) return 'de';
  if (/\b(bonjour|merci|aide|problème)\b/i.test(text)) return 'fr';
  if (/\b(hola|gracias|ayuda|problema)\b/i.test(text)) return 'es';
  return 'en';
}

interface SupportMessage {
  id: string;
  sender_type: 'customer' | 'admin' | 'bot';
  sender_name: string;
  message: string;
  created_at: string;
  read: boolean;
}


const MINING_FAQ = [
  {
    icon: Cpu,
    color: 'text-[#F0B90B]',
    bg: 'bg-[#F0B90B]/10',
    q: 'How do I start mining?',
    a: 'Go to the Shop tab and purchase your first mining equipment. Once bought, it starts earning EQ tokens automatically 24/7. No setup needed — just buy and earn.',
  },
  {
    icon: Pickaxe,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    q: 'How are EQ tokens calculated?',
    a: 'EQ tokens are earned based on your equipment\'s hashrate (TH/s). Higher hashrate = more EQ per hour. Premium machines have exponentially higher output. Check each machine\'s daily earnings in the Shop.',
  },
  {
    icon: DollarSign,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    q: 'How do I convert EQ to USDT?',
    a: 'Tap the Swap button in the Mining section or go to Assets > Swap. You can convert EQ to USDT at the current market rate instantly. Minimum swap amount is 1 EQ.',
  },
  {
    icon: Clock,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    q: 'How long does equipment last?',
    a: 'Each piece of equipment has a set duration (e.g. 30, 90, or 180 days). Once expired, mining stops. You can renew or upgrade to a better machine anytime. Your earned EQ remains in your balance.',
  },
  {
    icon: Shield,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    q: 'Is my mining income guaranteed?',
    a: 'Mining earnings depend on network conditions and EQ price. The hashrate displayed is guaranteed — you will earn at least the stated amount per day. Actual USDT value may vary with EQ market price.',
  },
  {
    icon: HelpCircle,
    color: 'text-gray-400',
    bg: 'bg-gray-400/10',
    q: 'Why is my equipment not earning?',
    a: 'Check if your equipment has expired. If the timer shows 0, you need to renew. Also make sure you are connected to the internet. If the issue persists, contact our support team below.',
  },
  {
    icon: Pickaxe,
    color: 'text-[#F0B90B]',
    bg: 'bg-[#F0B90B]/10',
    q: 'Can I have multiple machines running?',
    a: 'Yes! You can run multiple machines simultaneously. Your total earnings are the sum of all active machines. Upgrade your account level to unlock more equipment slots.',
  },
  {
    icon: DollarSign,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    q: 'When can I withdraw my EQ earnings?',
    a: 'You can convert EQ to USDT and withdraw at any time once you reach the minimum withdrawal threshold. Your account level affects withdrawal limits. Reach Level 5 for full withdrawal access.',
  },
];

const QUICK_QUESTIONS = [
  'Why is my equipment not working?',
  'How to increase my earnings?',
  'When can I withdraw?',
  'Equipment expired, what to do?',
  'Best machine for beginners?',
];

type Step = 'home' | 'form' | 'chat';

export default function SupportTab() {
  const [step, setStep] = useState<Step>('home');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [liveAgentCount, setLiveAgentCount] = useState(419);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentConnecting, setAgentConnecting] = useState(false);
  const [idVerifying, setIdVerifying] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<UserContextData | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ticketIdRef = useRef<string | null>(null);
  const customerIdRef = useRef<string>('');
  const agentRef = useRef<Agent | null>(null);
  const conversationRef = useRef<Array<{ role: 'customer' | 'agent'; text: string }>>([]);
  const userContextRef = useRef<UserContextData | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveAgentCount(prev => Math.max(410, Math.min(432, prev + (Math.random() > 0.5 ? 1 : -1))));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_id, email')
        .eq('id', user.id)
        .maybeSingle();
      if (profile) {
        setCustomerId(String(profile.user_id || ''));
        setEmail(profile.email || user.email || '');
      } else {
        setEmail(user.email || '');
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!customerId.trim() || customerId.trim().length < 3) {
      setVerifiedUser(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIdVerifying(true);
      const ctx = await verifyUserAndGetContext(customerId.trim());
      setIdVerifying(false);
      if (ctx && ctx.found) {
        const enriched = await enrichUserContextWithBonus(ctx, supabase as unknown as Parameters<typeof enrichUserContextWithBonus>[1]);
        setVerifiedUser(enriched);
        userContextRef.current = enriched;
        setFormError('');
      } else {
        setVerifiedUser(null);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [customerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentTyping]);

  useEffect(() => {
    if (step === 'chat' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 500);
    }
  }, [step]);

  useEffect(() => {
    if (!ticketId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (data) {
        setMessages(prev => {
          const realMsgs = data as SupportMessage[];
          const prevRealIds = new Set(prev.filter(m => !m.id.startsWith('opt_')).map(m => m.id));
          const hasNewAdmin = realMsgs.some(m => m.sender_type === 'admin' && !prevRealIds.has(m.id));
          if (hasNewAdmin) setIsAgentTyping(false);
          const optimisticMsgs = prev.filter(m => m.id.startsWith('opt_'));
          const realIds = new Set(realMsgs.map(m => m.id));
          const pendingOptimistic = optimisticMsgs.filter(o => !realIds.has(o.id));
          return [...realMsgs, ...pendingOptimistic];
        });
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);

    const channel = supabase
      .channel(`mining_ticket_${ticketId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticketId}` },
        (payload) => {
          const newMsg = payload.new as SupportMessage;
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            const realMsgs = prev.filter(m => !m.id.startsWith('opt_'));
            const optimisticMsgs = prev.filter(m => m.id.startsWith('opt_'));
            if (newMsg.sender_type === 'admin') setIsAgentTyping(false);
            return [...realMsgs, newMsg, ...optimisticMsgs];
          });
        })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const resetState = () => {
    setStep('home');
    setMessages([]);
    setAgent(null);
    setTicketId(null);
    setCustomerId('');
    setEmail('');
    setFormError('');
    setIsLoading(false);
    setAgentConnecting(false);
    setIdVerifying(false);
    setVerifiedUser(null);
    setPendingQuestion(undefined);
    ticketIdRef.current = null;
    customerIdRef.current = '';
  };

  const openForm = (initialQuestion?: string) => {
    setPendingQuestion(initialQuestion);
    setStep('form');
  };

  const triggerAIReply = useCallback(async (
    userText: string,
    tickId: string,
    ag: Agent,
    lang: string
  ) => {
    if (_miningTicketsBeingReplied.has(tickId)) return;
    try {
      const { data: aiSetting } = await supabase
        .from('exchange_settings')
        .select('value')
        .eq('key', 'global_ai_support')
        .maybeSingle();
      if (aiSetting?.value && (aiSetting.value as { enabled?: boolean }).enabled === false) {
        setIsAgentTyping(false);
        return;
      }
    } catch {}
    _miningTicketsBeingReplied.add(tickId);
    setIsAgentTyping(true);
    try {
      const convMsgs = conversationRef.current;
      const updatedConv = [...convMsgs, { role: 'customer' as const, text: userText }];
      const profile = analyzeUserProfile(updatedConv, lang);

      let replyText: string | null = null;
      try {
        replyText = await generateAIResponseFromOpenAI(userText, {
          messages: convMsgs,
          customerLanguage: lang,
          agentName: ag.name,
          userProfile: profile,
          userContext: userContextRef.current,
        });
      } catch {}

      if (!replyText) {
        replyText = generateAIResponse(userText, {
          messages: convMsgs,
          customerLanguage: lang,
          agentName: ag.name,
          userProfile: profile,
          userContext: userContextRef.current,
        });
      }

      const delay = getTypingDelay(replyText);
      await new Promise(r => setTimeout(r, delay));

      await supabase.from('support_messages').insert({
        ticket_id: tickId,
        sender_type: 'admin',
        sender_name: ag.name,
        message: replyText,
        original_message: replyText,
        original_language: 'ai',
        read: false,
      });

      conversationRef.current = [...updatedConv, { role: 'agent' as const, text: replyText }];
    } catch (err) {
      console.error('Mining support AI reply error:', err);
    } finally {
      _miningTicketsBeingReplied.delete(tickId);
      setIsAgentTyping(false);
    }
  }, []);

  const handleStartChat = async () => {
    if (!customerId.trim() || !email.trim()) {
      setFormError('Please fill in all fields');
      return;
    }
    setFormError('');
    setIsLoading(true);
    try {
      const countryInfo = await detectUserCountry();

      const { data: verifyResult } = await supabase.rpc('verify_support_user', {
        p_customer_id: customerId.trim(),
        p_email: email.trim()
      });

      const userId = (verifyResult && verifyResult.length > 0)
        ? verifyResult[0].user_id
        : customerId.trim();

      customerIdRef.current = String(userId);
      setCustomerId(String(userId));

      setAgentConnecting(true);
      const languageMap: Record<string, string> = {
        'TR': 'Turkish', 'ES': 'Spanish', 'MX': 'Spanish', 'DE': 'German',
        'IT': 'Italian', 'FR': 'French', 'CN': 'Chinese', 'JP': 'Japanese',
        'KR': 'Korean', 'SA': 'Arabic', 'AE': 'Arabic', 'PL': 'Polish', 'IN': 'Hindi'
      };
      const userLanguage = languageMap[countryInfo.country_code] || 'English';

      let assignedAgent = await assignBestAgent({ countryCode: countryInfo.country_code, language: userLanguage, specialty: 'account' });

      if (!assignedAgent) {
        const { data: anyAgent } = await supabase
          .from('support_agents')
          .select('*')
          .limit(1)
          .single();
        assignedAgent = anyAgent as Agent | null;
      }

      if (!assignedAgent) {
        assignedAgent = {
          id: 'default',
          name: 'Support Agent',
          country_code: 'US',
          country_name: 'Global',
          avatar_url: 'https://ui-avatars.com/api/?name=Support+Agent&background=F0B90B&color=181A20&size=128&bold=true',
          status: 'online',
          languages: ['English', 'Turkish'],
          specialty: 'account',
          flag: '',
          flag_emoji: '',
          timezone: 'UTC',
          region: 'Global',
          active_tickets: 0,
        };
      }

      const { data: ticket, error } = await supabase.from('support_tickets').insert({
        customer_id: String(userId),
        email: email.trim(),
        status: 'open',
        customer_country: countryInfo.country_code,
        assigned_agent_id: assignedAgent?.id === 'default' ? null : (assignedAgent?.id || null),
      }).select().single();

      if (error) throw error;

      setTicketId(ticket.id);
      ticketIdRef.current = ticket.id;
      setAgent(assignedAgent);
      agentRef.current = assignedAgent;
      setMessages([]);
      setStep('chat');
      setAgentConnecting(false);

      const activeTicketId = ticket.id;
      const activeAgent = assignedAgent;
      conversationRef.current = [];

      if (pendingQuestion) {
        const q = pendingQuestion;
        const qLang = detectMsgLang(q);
        const optimisticId = `opt_${Date.now()}`;
        const optimisticMsg: SupportMessage = {
          id: optimisticId,
          sender_type: 'customer',
          sender_name: String(userId),
          message: q,
          created_at: new Date().toISOString(),
          read: false,
        };
        setMessages([optimisticMsg]);

        const { data: inserted } = await supabase.from('support_messages').insert({
          ticket_id: ticket.id,
          sender_type: 'customer',
          sender_name: String(userId),
          message: q,
          original_message: q,
          original_language: qLang,
          read: false,
        }).select().maybeSingle();

        // Telegram bildirimi (admin "Reply" ile cevap yazabilsin)
        try {
          const text = `💬 <b>YENİ DESTEK MESAJI</b>\n\n👤 <code>${email || userId}</code>\n📝 ${q.slice(0, 500)}\n\n<i>Ticket: ${ticket.id}</i>\n\n💡 Bu mesaja <b>Reply</b> yazarsan kullanıcıya iletilir.`;
          fetch('/api/notify-event', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text }) }).catch(()=>{});
        } catch (_) {}

        if (inserted?.id) {
          setMessages(prev => prev.map(m => m.id === optimisticId ? { ...optimisticMsg, id: inserted.id } : m));
        }
        setTimeout(() => {
          triggerAIReply(q, activeTicketId, activeAgent, qLang);
        }, 600);
      }
    } catch (err) {
      console.error('Mining support start chat error:', err);
      setFormError('Could not start chat. Please try again.');
      setAgentConnecting(false);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (text?: string) => {
    const msgText = (text !== undefined ? text : messageInput).trim();
    const activeTicketId = ticketIdRef.current || ticketId;

    if (!msgText || !activeTicketId) return;
    if (text === undefined) setMessageInput('');

    const senderId = customerIdRef.current || customerId || 'user';

    const optimisticId = `opt_${Date.now()}`;
    const optimisticMsg: SupportMessage = {
      id: optimisticId,
      sender_type: 'customer',
      sender_name: senderId,
      message: msgText,
      created_at: new Date().toISOString(),
      read: false,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setIsAgentTyping(true);

    try {
      const { data: inserted, error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: activeTicketId,
          sender_type: 'customer',
          sender_name: senderId,
          message: msgText,
          original_message: msgText,
          original_language: 'ai',
          read: false,
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      if (inserted?.id) {
        setMessages(prev => prev.map(m => m.id === optimisticId ? { ...optimisticMsg, id: inserted.id } : m));
      }

      const activeAgent = agentRef.current;
      if (activeAgent) {
        const msgLang = detectMsgLang(msgText);
        setTimeout(() => {
          triggerAIReply(msgText, activeTicketId, activeAgent, msgLang);
        }, 400);
      } else {
        setTimeout(() => setIsAgentTyping(false), 30000);
      }
    } catch (err) {
      console.error('Mining support send error:', err);
      setIsAgentTyping(false);
    }
  };

  if (step === 'form') {
    const profile = verifiedUser?.profile as Record<string, unknown> | undefined;
    const miningSummary = verifiedUser?.mining_summary as Record<string, unknown> | undefined;
    const balances = (verifiedUser?.balances as Array<Record<string, unknown>>) || [];
    const usdtBal = balances.find(b => b.symbol === 'USDT');
    const usdtSpot = usdtBal ? Number(usdtBal.balance) : 0;

    return (
      <div className="min-h-screen bg-[#0B0E11] pb-24">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[#1E2329]">
          <button
            onClick={() => setStep('home')}
            className="text-gray-400 active:text-white transition-colors p-1 -ml-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-white font-bold text-sm">Verify Your Identity</h3>
            <p className="text-gray-500 text-xs">Connect Securely To Mining Support</p>
          </div>
        </div>

        <div className="px-4 py-5 space-y-4">
          {verifiedUser && profile ? (
            <div className="bg-gradient-to-br from-[#111418] to-[#0d1117] rounded-2xl p-4 border border-green-500/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-xs font-black uppercase tracking-widest">Account Verified</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#F0B90B]/20 border border-[#F0B90B]/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#F0B90B] font-black text-sm">
                    {String(profile.full_name || profile.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-none">{String(profile.full_name || 'User')}</p>
                  <p className="text-gray-400 text-xs mt-0.5">ID: {String(profile.user_id)} · VIP {String(profile.user_level || 1)}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[#F0B90B] font-black text-sm">${usdtSpot.toFixed(2)}</p>
                  <p className="text-gray-500 text-[10px]">USDT Balance</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#0B0E11] rounded-xl p-2.5 text-center border border-[#1E2329]">
                  <p className="text-white font-bold text-xs">{String(profile.total_trades || 0)}</p>
                  <p className="text-gray-500 text-[9px] mt-0.5">Total Trades</p>
                </div>
                <div className="bg-[#0B0E11] rounded-xl p-2.5 text-center border border-[#1E2329]">
                  <p className="text-white font-bold text-xs">{String(miningSummary?.total_equipment || 0)}</p>
                  <p className="text-gray-500 text-[9px] mt-0.5">Mining Equip.</p>
                </div>
                <div className="bg-[#0B0E11] rounded-xl p-2.5 text-center border border-[#1E2329]">
                  <p className="text-white font-bold text-xs capitalize">{String(profile.verification_status || 'unverified').slice(0, 8)}</p>
                  <p className="text-gray-500 text-[9px] mt-0.5">KYC Status</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#111418] rounded-2xl p-4 border border-[#1E2329]">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-3.5 h-3.5 text-[#F0B90B]" />
                <span className="text-white text-xs font-bold uppercase tracking-wide">Secure Verification</span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">Your identity is verified with end-to-end encryption to ensure a secure support session.</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-[10px] font-bold mb-2 uppercase tracking-[0.15em]">Customer ID</label>
              <div className="relative">
                <input
                  type="text"
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  placeholder="e.g. 255612"
                  className={`w-full bg-[#111418] border text-white rounded-xl px-4 py-3.5 text-sm outline-none transition-colors placeholder-gray-600 pr-10 ${
                    verifiedUser ? 'border-green-500/50 focus:border-green-500' : 'border-[#1E2329] focus:border-[#F0B90B]'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {idVerifying && (
                    <div className="w-4 h-4 border-2 border-[#F0B90B]/30 border-t-[#F0B90B] rounded-full animate-spin"></div>
                  )}
                  {!idVerifying && verifiedUser && (
                    <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-green-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-[10px] font-bold mb-2 uppercase tracking-[0.15em]">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-[#111418] border border-[#1E2329] focus:border-[#F0B90B] text-white rounded-xl px-4 py-3.5 text-sm outline-none transition-colors placeholder-gray-600"
                onKeyDown={e => e.key === 'Enter' && handleStartChat()}
              />
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-xs">{formError}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleStartChat}
            disabled={isLoading || agentConnecting || !customerId.trim() || !email.trim()}
            className="w-full bg-[#F0B90B] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0E11] font-black rounded-2xl py-4 transition-all active:scale-[0.98]"
          >
            {agentConnecting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#0B0E11]/30 border-t-[#0B0E11] rounded-full animate-spin"></div>
                <span className="text-sm">Connecting to Agent...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">Start Chat</span>
              </div>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'chat') {
    return (
      <div
        className="fixed z-[200] flex flex-col bg-[#0B0E11]"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: '100svh',
        }}
      >
        <div className="flex-shrink-0 bg-[#0D0E12] border-b border-[#1E2329] px-4 safe-top" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)', paddingBottom: '12px' }}>
          <div className="flex items-center gap-3 max-w-[428px] mx-auto">
            <button
              onClick={resetState}
              className="text-gray-400 active:text-white transition-colors p-2 -ml-2 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {agent ? (
              <>
                <div className="relative">
                  <img
                    src={agent.avatar_url}
                    alt={agent.name}
                    className="w-9 h-9 rounded-full object-cover border-2 border-[#F0B90B]/30"
                    onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=F0B90B&color=181A20&size=64&bold=true`; }}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0B0E11]"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm leading-none truncate">{agent.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-xs">Online · Mining Specialist</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">Mining Support</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-yellow-400 text-xs">Connecting...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-[428px] mx-auto space-y-3">
            {messages.map(msg => {
              const isCustomer = msg.sender_type === 'customer';
              return (
                <div key={msg.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                  {!isCustomer && agent && (
                    <img
                      src={agent.avatar_url}
                      alt={agent.name}
                      className="w-7 h-7 rounded-full object-cover mr-2 flex-shrink-0 self-end mb-1 border border-[#2B3139]"
                      onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=F0B90B&color=181A20&size=64&bold=true`; }}
                    />
                  )}
                  <div className="max-w-[72%]">
                    <div className={`rounded-2xl px-3.5 py-2.5 ${isCustomer ? 'bg-[#F0B90B] text-[#0B0E11] rounded-br-sm font-medium' : 'bg-[#1E2329] text-white rounded-bl-sm'}`}>
                      <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                    </div>
                    <div className={`flex items-center gap-1 mt-1 ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-gray-600 text-[10px]">
                        {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isCustomer && <Check className="w-3 h-3 text-gray-500" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {isAgentTyping && (
              <div className="flex justify-start items-end gap-2">
                {agent && (
                  <img
                    src={agent.avatar_url}
                    alt={agent.name}
                    className="w-7 h-7 rounded-full object-cover border border-[#2B3139] flex-shrink-0"
                    onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=F0B90B&color=181A20&size=64&bold=true`; }}
                  />
                )}
                <div className="bg-[#1E2329] rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div
          className="flex-shrink-0 bg-[#0D0E12] border-t border-[#1E2329] px-4 py-3"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
        >
          <div className="max-w-[428px] mx-auto">
            {messages.filter(m => m.sender_type === 'customer').length === 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {QUICK_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="flex-shrink-0 bg-[#1E2329] active:bg-[#252930] border border-[#2B3139] text-gray-300 text-xs rounded-full px-3 py-1.5 transition-all whitespace-nowrap"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && messageInput.trim() && (ticketIdRef.current || ticketId)) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type your message..."
                className="flex-1 bg-[#1E2329] border border-[#2B3139] focus:border-[#F0B90B] text-white placeholder-gray-500 px-4 py-3 rounded-2xl outline-none transition-colors"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                inputMode="text"
                enterKeyHint="send"
                style={{ fontSize: '16px' }}
              />
              <button
                onClick={() => { if (messageInput.trim()) sendMessage(); }}
                disabled={!messageInput.trim() || (!ticketIdRef.current && !ticketId)}
                className="w-11 h-11 bg-[#F0B90B] active:bg-[#d4a200] disabled:opacity-40 disabled:cursor-not-allowed text-[#0B0E11] rounded-2xl transition-all flex items-center justify-center flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] pb-24">
      <div className="px-4 pt-4 pb-3">
        <button
          onClick={() => openForm()}
          className="w-full bg-gradient-to-r from-[#F0B90B] to-[#d4a200] hover:from-[#d4a200] hover:to-[#F0B90B] text-[#0B0E11] font-black rounded-2xl py-4 px-5 transition-all shadow-lg shadow-[#F0B90B]/20 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#0B0E11]/20 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-black text-sm leading-none">Chat With Support</p>
                <p className="text-[#0B0E11]/70 text-xs mt-0.5 font-medium">Talk to a live mining specialist</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-900 rounded-full animate-pulse"></div>
              <span className="text-[#0B0E11]/70 text-xs font-bold">{liveAgentCount}+ Online</span>
            </div>
          </div>
        </button>
      </div>

      <div className="px-4 pb-3">
        <div className="bg-[#111418] rounded-2xl border border-[#1E2329] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1E2329]">
            <HelpCircle className="w-4 h-4 text-[#F0B90B]" />
            <h3 className="text-white font-bold text-sm">Mining FAQ</h3>
            <span className="text-gray-500 text-xs ml-auto">{MINING_FAQ.length} questions</span>
          </div>

          {MINING_FAQ.map((item, i) => {
            const Icon = item.icon;
            const isOpen = expandedFaq === i;
            return (
              <div key={i} className={`border-b border-[#1E2329] last:border-b-0 ${isOpen ? 'bg-[#0F1318]' : ''}`}>
                <button
                  onClick={() => setExpandedFaq(isOpen ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#0F1318] transition-colors"
                >
                  <div className={`w-8 h-8 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <span className={`flex-1 text-sm font-semibold ${isOpen ? 'text-[#F0B90B]' : 'text-white'} leading-snug`}>{item.q}</span>
                  <ChevronRight className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90 text-[#F0B90B]' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="ml-11">
                      <p className="text-gray-400 text-xs leading-relaxed">{item.a}</p>
                      <button
                        onClick={() => openForm(item.q)}
                        className="mt-3 flex items-center gap-1.5 text-[#F0B90B] text-xs font-semibold hover:text-[#d4a200] transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Still need help? Chat with an agent
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-24">
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Shield, label: 'Secure', desc: 'Encrypted Chat' },
            { icon: Clock, label: '24/7', desc: 'Always Online' },
            { icon: Gauge, label: '~45s', desc: 'Avg Response' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-[#111418] rounded-xl p-3 text-center border border-[#1E2329]">
              <Icon className="w-4 h-4 text-[#F0B90B] mx-auto mb-1.5" />
              <p className="text-white text-xs font-bold">{label}</p>
              <p className="text-gray-500 text-[10px] mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
