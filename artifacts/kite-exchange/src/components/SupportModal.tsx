import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Check, CheckCheck, ChevronRight, Shield, Clock, Star, Zap, MessageCircle, Phone, HelpCircle, Lock, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { detectUserCountry } from '../lib/geolocation';
import { assignBestAgent, getAgentStats, type Agent } from '../lib/agent-assignment';
import {
  verifyUserAndGetContext,
  generateAIResponseFromOpenAI,
  generateAIResponse,
  analyzeUserProfile,
  getTypingDelay,
  type UserProfile,
  type UserContextData,
} from '../lib/ai-support-engine';

// Shared across all React mounts/remounts — prevents StrictMode double-fire
const _ticketsBeingReplied = new Set<string>();

function detectMessageLanguage(text: string): string {
  if (!text || text.trim().length < 2) return 'en';
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
  if (arabicPattern.test(text)) return 'ar';
  const chinesePattern = /[\u4E00-\u9FFF]/;
  if (chinesePattern.test(text)) return 'zh';
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF]/;
  if (japanesePattern.test(text)) return 'ja';
  const koreanPattern = /[\uAC00-\uD7AF]/;
  if (koreanPattern.test(text)) return 'ko';
  const russianPattern = /[\u0400-\u04FF]/;
  if (russianPattern.test(text)) return 'ru';
  const turkishChars = /[çşğıöüÇŞĞİÖÜ]/;
  if (turkishChars.test(text)) return 'tr';
  const turkishWords = /\b(merhaba|selam|nasıl|neden|niye|teşekkür|lütfen|para|çekim|yatırım|hesap|sorun|yardım|evet|hayır|tamam|bilgi|destek|işlem|bakiye)\b/i;
  if (turkishWords.test(text)) return 'tr';
  const germanChars = /[äöüßÄÖÜ]/;
  if (germanChars.test(text)) return 'de';
  const germanWords = /\b(hallo|danke|bitte|hilfe|guten|ich|nicht|oder|aber|wenn)\b/i;
  if (germanWords.test(text)) return 'de';
  const frenchWords = /\b(bonjour|merci|s'il vous|je|nous|vous|pourquoi|comment|aide|problème)\b/i;
  if (frenchWords.test(text)) return 'fr';
  const spanishWords = /\b(hola|gracias|por favor|ayuda|problema|no puedo|necesito|cómo|qué|por qué)\b/i;
  if (spanishWords.test(text)) return 'es';
  return 'en';
}

interface SupportMessage {
  id: string;
  sender_type: 'customer' | 'admin' | 'bot';
  sender_name: string;
  message: string;
  created_at: string;
  read: boolean;
  original_message?: string;
  original_language?: string;
}

interface PrefillData {
  customerId?: string;
  email?: string;
  initialMessage?: string;
  skipToForm?: boolean;
}

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillData?: PrefillData;
}

const FAQ_ITEMS = [
  { icon: '💰', q: 'How Do I Deposit Funds?', a: 'Go to Wallet > Deposit, select your preferred network and copy the wallet address. Transactions confirm within 5-30 minutes.' },
  { icon: '📤', q: 'How Long Do Withdrawals Take?', a: 'Withdrawals are processed within 1-24 hours after identity verification. Network fees apply.' },
  { icon: '🔐', q: 'How Do I Secure My Account?', a: 'Enable 2FA in Security Settings, use a strong unique password, and never share your credentials.' },
  { icon: '📈', q: 'What Is Futures Trading?', a: 'Futures trading lets you trade with leverage up to 125x. Always use stop-loss to manage risk.' },
  { icon: '⚡', q: 'How Does Mining Work?', a: 'Purchase mining equipment to earn EQ tokens passively. Higher tier machines yield more rewards.' },
];

const QUICK_REPLIES = [
  'Deposit issue',
  'Withdrawal problem',
  'Account verification',
  'Transaction issue',
  'Security concern',
];

const COUNTRIES_GRID = [
  { flag: '🇬🇧', name: 'United Kingdom', count: 67 },
  { flag: '🇩🇪', name: 'Germany', count: 58 },
  { flag: '🇺🇸', name: 'United States', count: 112 },
  { flag: '🇫🇷', name: 'France', count: 44 },
  { flag: '🇹🇷', name: 'Turkey', count: 45 },
  { flag: '🇮🇹', name: 'Italy', count: 38 },
  { flag: '🇸🇦', name: 'Saudi Arabia', count: 29 },
  { flag: '🇯🇵', name: 'Japan', count: 51 },
  { flag: '🇳🇱', name: 'Netherlands', count: 22 },
  { flag: '🇦🇪', name: 'UAE', count: 33 },
  { flag: '🇨🇳', name: 'China', count: 76 },
  { flag: '🇰🇷', name: 'South Korea', count: 41 },
];

export default function SupportModal({ isOpen, onClose, prefillData }: SupportModalProps) {
  const [step, setStep] = useState<'home' | 'form' | 'chat'>('home');
  const [customerId, setCustomerId] = useState(prefillData?.customerId || '');
  const [email, setEmail] = useState(prefillData?.email || '');
  const pendingInitialMessageRef = useRef<string | null>(prefillData?.initialMessage || null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [assignedAgent, setAssignedAgent] = useState<Agent | null>(null);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [liveAgentCount, setLiveAgentCount] = useState(419);
  const [customerLanguage, setCustomerLanguage] = useState<string>('en');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const [agentConnecting, setAgentConnecting] = useState(false);
  const [idVerifying, setIdVerifying] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<UserContextData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationRef = useRef<Array<{ role: 'customer' | 'agent'; text: string }>>([]);
  const userProfileRef = useRef<UserProfile>({ language: 'en', experienceLevel: 'beginner', emotionalState: 'calm', intent: 'general', messageCount: 0 });
  const userContextRef = useRef<UserContextData | null>(null);
  const ticketIdRef = useRef<string | null>(null);
  const customerIdRef = useRef<string>('');
  const customerLanguageRef = useRef<string>('ai');
  const assignedAgentRef = useRef<Agent | null>(null);
  const _lastSendKey = useRef<string>('');
  const _lastSendTime = useRef<number>(0);

  useEffect(() => {
    if (isOpen) { getAgentStats(); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setLiveAgentCount(prev => Math.max(410, Math.min(432, prev + (Math.random() > 0.5 ? 1 : -1))));
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setStep('home');
      setCustomerId('');
      setEmail('');
      setTicketId(null);
      setMessages([]);
      setNewMessage('');
      setAssignedAgent(null);
      setIsAgentTyping(false);
      setFormError('');
      setAgentConnecting(false);
      setIdVerifying(false);
      setVerifiedUser(null);
      userContextRef.current = null;
      conversationRef.current = [];
      ticketIdRef.current = null;
      customerIdRef.current = '';
      customerLanguageRef.current = 'ai';
      pendingInitialMessageRef.current = null;
    } else {
      if (prefillData?.customerId) setCustomerId(prefillData.customerId);
      if (prefillData?.email) setEmail(prefillData.email);
      if (prefillData?.initialMessage) pendingInitialMessageRef.current = prefillData.initialMessage;
      if (prefillData?.skipToForm) setStep('form');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!customerId.trim() || customerId.trim().length < 3) {
      setVerifiedUser(null);
      userContextRef.current = null;
      return;
    }
    const timer = setTimeout(async () => {
      setIdVerifying(true);
      const ctx = await verifyUserAndGetContext(customerId.trim());
      setIdVerifying(false);
      if (ctx && ctx.found) {
        setVerifiedUser(ctx);
        userContextRef.current = ctx;
        setFormError('');
      } else {
        setVerifiedUser(null);
        userContextRef.current = null;
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [customerId]);

  useEffect(() => {
    customerIdRef.current = customerId;
  }, [customerId]);

  useEffect(() => {
    customerLanguageRef.current = customerLanguage;
  }, [customerLanguage]);

  useEffect(() => {
    ticketIdRef.current = ticketId;
  }, [ticketId]);

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
          const hasNewAdmin = realMsgs.some(
            m => m.sender_type === 'admin' && !prevRealIds.has(m.id)
          );
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
      .channel(`user_ticket_${ticketId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `ticket_id=eq.${ticketId}`,
      }, (payload) => {
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

  const translateMessage = async (text: string, sourceLang: string, targetLang: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-message`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLang, targetLang }),
      });
      if (!response.ok) throw new Error('Translation failed');
      return await response.json();
    } catch {
      return { translatedText: text, detectedLanguage: sourceLang };
    }
  };

  const detectLanguage = useCallback(async (countryCode: string): Promise<string> => {
    const countryToLang: Record<string, string> = {
      'tr': 'tr', 'us': 'en', 'gb': 'en', 'au': 'en', 'ca': 'en', 'nz': 'en',
      'es': 'es', 'mx': 'es', 'ar': 'es', 'co': 'es', 'de': 'de', 'at': 'de',
      'fr': 'fr', 'be': 'fr', 'it': 'it', 'nl': 'nl', 'pt': 'pt', 'br': 'pt',
      'ru': 'ru', 'pl': 'pl', 'cn': 'zh', 'tw': 'zh', 'jp': 'ja', 'kr': 'ko',
      'sa': 'ar', 'ae': 'ar', 'eg': 'ar', 'iq': 'ar', 'in': 'hi',
    };
    const browserLang = navigator.language.split('-')[0].toLowerCase();
    const supportedLangs = ['tr', 'en', 'es', 'de', 'fr', 'it', 'nl', 'pt', 'ru', 'pl', 'zh', 'ja', 'ko', 'ar', 'hi'];
    if (supportedLangs.includes(browserLang)) return browserLang;
    return countryToLang[countryCode.toLowerCase()] || 'en';
  }, []);

  const triggerAIReply = useCallback(async (
    userText: string,
    tickId: string,
    agent: Agent,
    lang: string
  ) => {
    // Module-level guard — one reply per ticket at a time, survives StrictMode remounts
    if (_ticketsBeingReplied.has(tickId)) return;
    _ticketsBeingReplied.add(tickId);
    setIsAgentTyping(true);
    try {
      const convMsgs = conversationRef.current;
      const updatedConv = [...convMsgs, { role: 'customer' as const, text: userText }];
      const profile = analyzeUserProfile(updatedConv, lang);
      userProfileRef.current = profile;

      let replyText: string | null = null;

      try {
        replyText = await generateAIResponseFromOpenAI(userText, {
          messages: convMsgs,
          customerLanguage: lang,
          agentName: agent.name,
          userProfile: profile,
          userContext: userContextRef.current,
        });
      } catch {}

      if (!replyText) {
        replyText = generateAIResponse(userText, {
          messages: convMsgs,
          customerLanguage: lang,
          agentName: agent.name,
          userProfile: profile,
          userContext: userContextRef.current,
        });
      }

      const delay = getTypingDelay(replyText);
      await new Promise(r => setTimeout(r, delay));

      await supabase.from('support_messages').insert({
        ticket_id: tickId,
        sender_type: 'admin',
        sender_name: agent.name,
        message: replyText,
        original_message: replyText,
        original_language: 'ai',
        read: false,
      });

      conversationRef.current = [
        ...updatedConv,
        { role: 'agent' as const, text: replyText },
      ];
    } catch (err) {
      console.error('AI reply error:', err);
    } finally {
      _ticketsBeingReplied.delete(tickId);
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

      const languageMap: Record<string, string> = {
        'TR': 'Turkish', 'ES': 'Spanish', 'MX': 'Spanish', 'DE': 'German',
        'IT': 'Italian', 'FR': 'French', 'CN': 'Chinese', 'JP': 'Japanese',
        'KR': 'Korean', 'SA': 'Arabic', 'AE': 'Arabic', 'PL': 'Polish', 'IN': 'Hindi'
      };
      const userLanguage = languageMap[countryInfo.country_code] || 'English';

      setAgentConnecting(true);
      let agent = await assignBestAgent({ countryCode: countryInfo.country_code, language: userLanguage, specialty: 'account' });

      if (!agent) {
        const { data: anyAgent } = await supabase
          .from('support_agents')
          .select('*')
          .limit(1)
          .single();
        agent = anyAgent as Agent | null;
      }

      if (!agent) {
        agent = {
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
        customer_id: userId,
        email: email.trim(),
        status: 'open',
        customer_country: countryInfo.country_code,
        assigned_agent_id: agent?.id === 'default' ? null : (agent?.id || null),
      }).select().single();

      if (error) throw error;

      setTicketId(ticket.id);
      ticketIdRef.current = ticket.id;
      setAssignedAgent(agent);
      assignedAgentRef.current = agent;

      const customerLang = await detectLanguage(countryInfo.country_code);
      setCustomerLanguage(customerLang);
      customerLanguageRef.current = customerLang;

      setMessages([]);
      setStep('chat');
      setAgentConnecting(false);

      const activeTicketId = ticket.id;
      const activeAgent = agent;
      const activeLang = customerLang;

      conversationRef.current = [];

      if (pendingInitialMessageRef.current) {
        const initMsg = pendingInitialMessageRef.current;
        pendingInitialMessageRef.current = null;
        const msgLang = detectMessageLanguage(initMsg);
        customerLanguageRef.current = msgLang;
        setCustomerLanguage(msgLang);
        setTimeout(async () => {
          const senderId = userId;
          await supabase.from('support_messages').insert({
            ticket_id: activeTicketId,
            sender_type: 'customer',
            sender_name: senderId,
            message: initMsg,
            original_message: initMsg,
            original_language: msgLang,
            read: false,
          });
          setTimeout(() => {
            triggerAIReply(initMsg, activeTicketId, activeAgent, msgLang);
          }, 500);
        }, 600);
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      setFormError('Could not start chat. Please try again.');
      setAgentConnecting(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = (text !== undefined ? text : newMessage).trim();
    const activeTicketId = ticketIdRef.current || ticketId;

    if (!messageText || !activeTicketId) {
      console.warn('No message or ticketId', { messageText: !!messageText, ticketId: activeTicketId });
      return;
    }

    // Prevent double-send (Enter key + button click firing simultaneously)
    const sendKey = `${activeTicketId}:${messageText}`;
    const now = Date.now();
    if (_lastSendKey.current === sendKey && now - _lastSendTime.current < 2000) return;
    _lastSendKey.current = sendKey;
    _lastSendTime.current = now;

    if (text === undefined) setNewMessage('');

    const senderId = customerIdRef.current || customerId || 'user';
    const lang = detectMessageLanguage(messageText);

    const optimisticId = `opt_${Date.now()}`;
    const optimisticMsg: SupportMessage = {
      id: optimisticId,
      sender_type: 'customer',
      sender_name: senderId,
      message: messageText,
      created_at: new Date().toISOString(),
      read: false,
      original_message: messageText,
      original_language: lang,
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
          message: messageText,
          original_message: messageText,
          original_language: lang,
          read: false,
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Insert error:', JSON.stringify(error));
        throw error;
      }

      if (inserted?.id) {
        setMessages(prev => prev.map(m => m.id === optimisticId ? { ...optimisticMsg, id: inserted.id } : m));
      }

      const currentAgent = assignedAgentRef.current;
      const currentTicketId = ticketIdRef.current;
      const msgLang = detectMessageLanguage(messageText);
      if (currentAgent && currentTicketId) {
        triggerAIReply(messageText, currentTicketId, currentAgent, msgLang);
      } else {
        setTimeout(() => setIsAgentTyping(false), 30000);
      }
    } catch (err) {
      console.error('Message send error:', err);
      setIsAgentTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] sm:p-4" style={{ top: 0 }}>
      <div
        className="bg-[#0B0E11] sm:rounded-2xl w-full flex flex-col overflow-hidden sm:max-h-[90vh] sm:max-w-md border border-[#1E2329] shadow-2xl"
        style={{ height: 'calc(100svh - 65px)', maxHeight: 'calc(100svh - 65px)' }}
      >
        {step === 'home' && (
          <HomeScreen
            liveAgentCount={liveAgentCount}
            onStartChat={() => setStep('form')}
            onClose={onClose}
            expandedFaq={expandedFaq}
            setExpandedFaq={setExpandedFaq}
          />
        )}

        {step === 'form' && (
          <FormScreen
            customerId={customerId}
            setCustomerId={setCustomerId}
            email={email}
            setEmail={setEmail}
            isLoading={isLoading}
            agentConnecting={agentConnecting}
            formError={formError}
            idVerifying={idVerifying}
            verifiedUser={verifiedUser}
            onBack={() => setStep('home')}
            onClose={onClose}
            onSubmit={handleStartChat}
          />
        )}

        {step === 'chat' && ticketId && (
          <ChatScreen
            agent={assignedAgent || {
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
            }}
            messages={messages}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            isAgentTyping={isAgentTyping}
            ticketId={ticketId}
            customerId={customerId}
            inputRef={inputRef}
            messagesEndRef={messagesEndRef}
            onSend={handleSendMessage}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

function GlobeIcon() {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-[#F0B90B]/20 animate-ping" style={{ animationDuration: '2s' }}></div>
      <div className="relative w-10 h-10 bg-[#F0B90B]/15 rounded-full border border-[#F0B90B]/40 flex items-center justify-center">
        <Globe className="w-5 h-5 text-[#F0B90B]" />
      </div>
    </div>
  );
}

function HomeScreen({ liveAgentCount, onStartChat, onClose, expandedFaq, setExpandedFaq }: {
  liveAgentCount: number;
  onStartChat: () => void;
  onClose: () => void;
  expandedFaq: number | null;
  setExpandedFaq: (i: number | null) => void;
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0">
        <div className="bg-gradient-to-br from-[#F0B90B] via-[#e8b008] to-[#c49a00] px-5 pt-12 pb-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-[#181A20] rounded-full animate-pulse"></div>
                <span className="text-[#181A20]/80 text-[10px] font-black tracking-[0.2em] uppercase">Live Support</span>
              </div>
              <h2 className="text-[#181A20] text-[26px] font-black leading-[1.15] tracking-tight">
                How Can We<br />Help You?
              </h2>
            </div>
            <button onClick={onClose} className="text-[#181A20]/50 hover:text-[#181A20] transition-colors p-1 mt-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-[#181A20]/15 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-3 border border-[#181A20]/10">
            <div className="flex -space-x-2.5 flex-shrink-0">
              {['/ber1.jpg', '/ber3.jpg', '/ber5.png'].map((src, i) => (
                <img key={i} src={src} alt="" className="w-9 h-9 rounded-full border-2 border-[#F0B90B] object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=Agent&background=181A20&color=F0B90B&size=64`; }} />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50"></div>
                <span className="text-[#181A20] font-black text-sm">{liveAgentCount}+ Agents Online</span>
              </div>
              <p className="text-[#181A20]/65 text-xs font-medium">Avg. Response Time &nbsp;~45s</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-[#0B0E11] border-b border-[#1E2329]">
          <button
            onClick={onStartChat}
            className="relative w-full overflow-hidden rounded-2xl group"
            style={{ background: 'linear-gradient(135deg, #F0B90B 0%, #FFD443 50%, #F0B90B 100%)', backgroundSize: '200% 200%', animation: 'gradientShift 3s ease infinite' }}
          >
            <style>{`
              @keyframes gradientShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
              @keyframes pulseRing { 0%{transform:scale(0.95);box-shadow:0 0 0 0 rgba(240,185,11,0.7)} 70%{transform:scale(1);box-shadow:0 0 0 10px rgba(240,185,11,0)} 100%{transform:scale(0.95);box-shadow:0 0 0 0 rgba(240,185,11,0)} }
              .chat-btn-pulse { animation: pulseRing 2s cubic-bezier(0.455,0.03,0.515,0.955) infinite; }
              @keyframes shimmer { 0%{transform:translateX(-100%) skewX(-20deg)} 100%{transform:translateX(200%) skewX(-20deg)} }
              .shimmer-effect::after { content:''; position:absolute; top:0; left:0; width:40%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent); animation:shimmer 2.5s ease-in-out infinite; }
            `}</style>
            <div className="shimmer-effect relative flex items-center justify-between px-5 py-4 active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-3.5">
                <div className="chat-btn-pulse w-12 h-12 bg-[#0B0E11]/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-[#0B0E11]" />
                </div>
                <div className="text-left">
                  <p className="text-[#0B0E11] font-black text-base leading-tight tracking-tight">Chat With Support</p>
                  <p className="text-[#0B0E11]/70 text-xs mt-0.5 font-semibold">Talk To Live Agent Now</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5 bg-[#0B0E11]/20 rounded-full px-2.5 py-1">
                    <div className="w-2 h-2 bg-green-900 rounded-full animate-pulse"></div>
                    <span className="text-[#0B0E11] text-[10px] font-black">ONLINE</span>
                  </div>
                </div>
                <div className="w-8 h-8 bg-[#0B0E11]/20 rounded-xl flex items-center justify-center group-hover:bg-[#0B0E11]/30 transition-colors">
                  <ChevronRight className="w-4 h-4 text-[#0B0E11] group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-4 h-4 text-[#F0B90B]" />
            <h3 className="text-white font-bold text-sm tracking-wide">Frequently Asked Questions</h3>
          </div>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="bg-[#111418] rounded-xl overflow-hidden border border-[#1E2329] hover:border-[#2B3139] transition-colors">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    <span className="text-white text-sm font-semibold">{item.q}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-200 ${expandedFaq === i ? 'rotate-90 text-[#F0B90B]' : ''}`} />
                </button>
                {expandedFaq === i && (
                  <div className="px-4 pb-4 pt-0 border-t border-[#1E2329]">
                    <p className="text-gray-400 text-xs leading-relaxed pt-3">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pb-6">
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { icon: Shield, label: 'Secure', desc: 'SSL Encrypted' },
              { icon: Clock, label: '24/7', desc: 'Always Available' },
              { icon: Star, label: '4.9/5', desc: 'Customer Rating' },
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
    </div>
  );
}

function FormScreen({ customerId, setCustomerId, email, setEmail, isLoading, agentConnecting, formError, idVerifying, verifiedUser, onBack, onClose, onSubmit }: {
  customerId: string;
  setCustomerId: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  isLoading: boolean;
  agentConnecting: boolean;
  formError: string;
  idVerifying: boolean;
  verifiedUser: UserContextData | null;
  onBack: () => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const profile = verifiedUser?.profile as Record<string, unknown> | undefined;
  const miningSummary = verifiedUser?.mining_summary as Record<string, unknown> | undefined;
  const balances = (verifiedUser?.balances as Array<Record<string, unknown>>) || [];
  const usdtBal = balances.find(b => b.symbol === 'USDT');
  const usdtSpot = usdtBal ? Number(usdtBal.balance) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-[#1E2329] bg-[#0B0E11]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors p-1 -ml-1">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h3 className="text-white font-bold text-sm">Verify Your Identity</h3>
            <p className="text-gray-500 text-xs">Connect Securely To Support</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
        {!verifiedUser && (
          <div className="bg-[#111418] rounded-2xl p-4 mb-5 border border-[#1E2329]">
            <div className="flex items-center gap-3 mb-4">
              <GlobeIcon />
              <div>
                <p className="text-white font-bold text-sm">Global Support Network</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-xs font-semibold">420+ Agents Online</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {COUNTRIES_GRID.map(({ flag, name, count }) => (
                <div key={name} className="flex flex-col items-center justify-center bg-[#0B0E11] rounded-xl px-2 py-2.5 border border-[#1E2329] hover:border-[#2B3139] transition-colors">
                  <span className="text-xl mb-1 leading-none">{flag}</span>
                  <span className="text-gray-400 text-[9px] text-center leading-tight font-medium truncate w-full text-center">{name}</span>
                  <span className="text-white text-xs font-bold mt-0.5">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {verifiedUser && profile && (
          <div className="bg-gradient-to-br from-[#111418] to-[#0d1117] rounded-2xl p-4 mb-5 border border-green-500/30 shadow-lg shadow-green-500/5">
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
        )}

        <div className="bg-[#111418] rounded-2xl p-4 mb-5 border border-[#1E2329]">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-3.5 h-3.5 text-[#F0B90B]" />
            <span className="text-white text-xs font-bold tracking-wide uppercase">Secure Verification</span>
          </div>
          <p className="text-gray-500 text-xs leading-relaxed">Your identity is verified with end-to-end encryption to ensure a secure support session.</p>
        </div>

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
                onKeyPress={e => e.key === 'Enter' && onSubmit()}
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
            {!idVerifying && customerId.trim().length >= 3 && !verifiedUser && (
              <p className="text-gray-500 text-[10px] mt-1.5 pl-1">Enter your numeric platform ID (found in Profile)</p>
            )}
          </div>
          <div>
            <label className="block text-gray-400 text-[10px] font-bold mb-2 uppercase tracking-[0.15em]">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-[#111418] border border-[#1E2329] focus:border-[#F0B90B] text-white rounded-xl px-4 py-3.5 text-sm outline-none transition-colors placeholder-gray-600"
              onKeyPress={e => e.key === 'Enter' && onSubmit()}
            />
          </div>

          {formError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <div className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0"></div>
              <p className="text-red-400 text-xs">{formError}</p>
            </div>
          )}

          <button
            onClick={onSubmit}
            disabled={isLoading || agentConnecting || !customerId.trim() || !email.trim()}
            className="w-full bg-[#F0B90B] hover:bg-[#d4a200] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B0E11] font-black rounded-xl py-4 text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#F0B90B]/20"
          >
            {agentConnecting ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0B0E11]/30 border-t-[#0B0E11] rounded-full animate-spin"></div>
                Connecting To Agent...
              </>
            ) : isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0B0E11]/30 border-t-[#0B0E11] rounded-full animate-spin"></div>
                Verifying...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Start Live Chat
              </>
            )}
          </button>

          <p className="text-gray-600 text-[10px] text-center pt-1">By continuing, you agree to our Terms Of Service</p>
        </div>
      </div>
    </div>
  );
}

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '';
  return Array.from(countryCode.toUpperCase())
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('');
}

function ChatScreen({ agent, messages, newMessage, setNewMessage, isAgentTyping, ticketId, customerId, inputRef, messagesEndRef, onSend, onClose }: {
  agent: Agent;
  messages: SupportMessage[];
  newMessage: string;
  setNewMessage: (v: string) => void;
  isAgentTyping: boolean;
  ticketId: string | null;
  customerId: string;
  inputRef: React.RefObject<HTMLInputElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onSend: (text?: string) => void;
  onClose: () => void;
}) {
  const showQuickReplies = messages.filter(m => m.sender_type === 'customer').length === 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim()) {
        onSend();
      }
    }
  };

  return (
    <>
      <div className="flex-shrink-0 bg-[#0B0E11] border-b border-[#1E2329]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <img
                src={agent.avatar_url}
                alt={agent.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-[#F0B90B]/30"
                onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=F0B90B&color=181A20&size=128&bold=true`; }}
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0B0E11]"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm leading-none">{agent.name}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-xs font-medium">Online</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0 bg-[#0B0E11]">
        {messages.length === 0 && !isAgentTyping && (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <div className="w-16 h-16 bg-[#F0B90B]/10 rounded-2xl flex items-center justify-center mb-4 border border-[#F0B90B]/20">
              <Phone className="w-7 h-7 text-[#F0B90B]" />
            </div>
            <p className="text-white font-semibold text-sm mb-1">{agent.name} connected</p>
            <p className="text-gray-500 text-xs mb-5">Type a message to get started</p>
            {showQuickReplies && (
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_REPLIES.map(reply => (
                  <button
                    key={reply}
                    onClick={() => onSend(reply)}
                    className="bg-[#1E2329] hover:bg-[#252930] border border-[#2B3139] hover:border-[#F0B90B]/30 text-gray-300 hover:text-white text-xs rounded-full px-3 py-1.5 transition-all"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender_type !== 'customer' && (
              <img
                src={agent.avatar_url}
                alt={agent.name}
                className="w-7 h-7 rounded-full object-cover mr-2 flex-shrink-0 self-end mb-1 border border-[#2B3139]"
                onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=F0B90B&color=181A20&size=64&bold=true`; }}
              />
            )}
            <div className="max-w-[72%]">
              <div className={`rounded-2xl px-3.5 py-2.5 ${msg.sender_type === 'customer' ? 'bg-[#F0B90B] text-[#0B0E11] rounded-br-sm' : 'bg-[#1E2329] text-white rounded-bl-sm'}`}>
                <p className="text-sm leading-relaxed break-words">{msg.message}</p>
              </div>
              <div className={`flex items-center gap-1 mt-1 ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
                <span className="text-gray-600 text-[10px]">
                  {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.sender_type === 'customer' && (
                  msg.read ? <CheckCheck className="w-3 h-3 text-[#F0B90B]" /> : <Check className="w-3 h-3 text-gray-600" />
                )}
              </div>
            </div>
          </div>
        ))}

        {isAgentTyping && (
          <div className="flex justify-start items-end gap-2">
            <img
              src={agent.avatar_url}
              alt={agent.name}
              className="w-7 h-7 rounded-full object-cover border border-[#2B3139] flex-shrink-0"
              onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=F0B90B&color=181A20&size=64&bold=true`; }}
            />
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

      <div className="flex-shrink-0 bg-[#0B0E11] border-t border-[#1E2329] px-4 py-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 bg-[#1E2329] border border-[#2B3139] focus:border-[#F0B90B] text-white placeholder-gray-600 px-4 py-3 rounded-2xl text-sm outline-none transition-colors"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            inputMode="text"
            enterKeyHint="send"
            style={{ fontSize: '16px' }}
          />
          <button
            onClick={() => { if (newMessage.trim()) onSend(); }}
            disabled={!newMessage.trim()}
            className="w-11 h-11 bg-[#F0B90B] hover:bg-[#d4a200] disabled:opacity-40 disabled:cursor-not-allowed text-[#0B0E11] rounded-2xl transition-all flex items-center justify-center flex-shrink-0 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {ticketId && (
          <p className="text-gray-700 text-[10px] mt-2 text-center">
            Ticket #{ticketId.slice(0, 8).toUpperCase()} · {customerId}
          </p>
        )}
      </div>
    </>
  );
}
