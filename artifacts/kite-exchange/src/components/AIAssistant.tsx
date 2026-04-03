import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, User, Loader2, Trash2, AlertCircle, RefreshCw,
  Shield, Bell, Calendar, FileText, Activity, ChevronRight,
  Zap, TrendingUp, DollarSign, Users, Cpu, ShieldAlert,
  BarChart3, Settings2, Sparkles, MessageSquare,
  Image, Upload, X, CheckCircle2, Database, Code2,
  Eye, Copy, Play, Key, Lock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  fetchFullPlatformContext, buildSystemPrompt, logAction, createAlert,
  analyzeScreenshotWithVision, parseVisionResponse, runSQLMigration,
  deployEdgeFunctionViaAPI,
  adjustUserBalance, bulkBonusDistribution, approveWithdrawal, rejectWithdrawal,
  approveAllPendingWithdrawals, freezeUser, unfreezeUser,
  closeFuturesPosition, closeAllHighRiskPositions, flagUserForFraud,
  closeTicket, createAutomationRule, getUserFullProfile,
  getPendingWithdrawals, getOpenSupportTickets, listAllUsers,
  type PlatformContext, type VisionAnalysis, type ActionResult
} from '../lib/assistant-engine';
import AssistantHealthPanel from './assistant/AssistantHealthPanel';
import AssistantRulesPanel from './assistant/AssistantRulesPanel';
import AssistantAlertsPanel from './assistant/AssistantAlertsPanel';
import AssistantScheduledPanel from './assistant/AssistantScheduledPanel';
import AssistantFraudPanel from './assistant/AssistantFraudPanel';
import AssistantActionsLog from './assistant/AssistantActionsLog';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
  retryPayload?: { text: string };
  actionsTaken?: string[];
  hasImage?: boolean;
  imagePreview?: string;
  visionAnalysis?: VisionAnalysis;
  deployStatus?: 'pending' | 'deploying' | 'success' | 'failed';
  deployMessage?: string;
}

interface ApiKeys {
  openai: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
}

type Panel = 'chat' | 'health' | 'rules' | 'alerts' | 'scheduled' | 'fraud' | 'logs';
type SetupStep = 'openai' | 'supabase' | 'done';

const PANEL_CONFIG: { key: Panel; label: string; icon: typeof Bot; color: string }[] = [
  { key: 'chat', label: 'AI Sohbet', icon: MessageSquare, color: 'text-[#F0B90B]' },
  { key: 'health', label: 'Platform Sagligi', icon: Activity, color: 'text-emerald-400' },
  { key: 'alerts', label: 'Uyarilar', icon: Bell, color: 'text-red-400' },
  { key: 'fraud', label: 'Fraud & Guvenlik', icon: ShieldAlert, color: 'text-orange-400' },
  { key: 'rules', label: 'Kural Motoru', icon: Shield, color: 'text-amber-400' },
  { key: 'scheduled', label: 'Zamanli Gorevler', icon: Calendar, color: 'text-cyan-400' },
  { key: 'logs', label: 'Aksiyon Kayitlari', icon: FileText, color: 'text-gray-400' },
];

const QUICK_COMMANDS = [
  { icon: Activity, label: 'Platform sagligi', prompt: 'Platformun tam durumunu analiz et. Saglik skoru, kritik sorunlar ve acil aksiyonlari raporla.', color: 'text-emerald-400' },
  { icon: DollarSign, label: 'Bekleyen cekimler', prompt: 'Bekleyen tum cekimleri listele.', color: 'text-emerald-400' },
  { icon: ShieldAlert, label: 'Fraud taramasi', prompt: 'Simdi bir fraud taramasi yap. Suphelı aktiviteleri, sifir deposit cekimcileri ve yuksek riskli kullanicilari listele.', color: 'text-red-400' },
  { icon: TrendingUp, label: 'Tum cekimleri onayla', prompt: 'Tum bekleyen cekimleri onayla.', color: 'text-amber-400' },
  { icon: Users, label: 'Acik biletler', prompt: 'Acik destek biletlerini listele.', color: 'text-blue-400' },
  { icon: Cpu, label: 'Mining raporu', prompt: 'Mining sisteminin durumunu raporla. Aktif miner sayisi, ekipman dagilimi ve EQ kazanim istatistiklerini ver.', color: 'text-violet-400' },
  { icon: Bell, label: 'Destek durumu', prompt: 'Destek sistemi durumunu raporla. Acik biletler, 4+ saat cevapsizlar, kritik konular ve SLA ihlallerini listele.', color: 'text-cyan-400' },
  { icon: Zap, label: 'Hizli saglik', prompt: 'Platforma bak, her sey yolunda mi? Sorun varsa listeyle ve onerilen aksiyonlari soy.', color: 'text-[#F0B90B]' },
  { icon: BarChart3, label: 'Gunluk rapor', prompt: 'Bugunun tam platformu ozeti: kullanici aktivitesi, islem hacimleri, mining, destek ve guvenlik durumu dahil kapsamli rapor ver.', color: 'text-pink-400' },
  { icon: Settings2, label: 'Otomasyon durumu', prompt: 'Kural motoru ve zamanli gorevlerin durumunu raporla. Kac kural aktif, hangi gorevler calisiyor, son calistirma zamanlari.', color: 'text-gray-400' },
];

const PROBLEM_TYPE_LABELS: Record<string, { label: string; color: string; icon: typeof Database }> = {
  database: { label: 'Veritabani', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Database },
  edge_function: { label: 'Edge Function', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: Code2 },
  frontend: { label: 'Frontend', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Eye },
  config: { label: 'Konfigurasyon', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: Settings2 },
  unknown: { label: 'Bilinmiyor', color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', icon: AlertCircle },
};

function loadKeys(): ApiKeys {
  return {
    openai: localStorage.getItem('openai_api_key') || '',
    supabaseUrl: localStorage.getItem('supabase_url_key') || '',
    supabaseServiceKey: localStorage.getItem('supabase_service_key') || '',
  };
}

async function callOpenAI(
  messages: { role: string; content: string | unknown[] }[],
  apiKey: string,
  retryCount = 0
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 800, temperature: 0.3 }),
  });

  if (response.status === 429) {
    if (retryCount < 2) {
      const retryAfter = parseInt(response.headers.get('retry-after') || '10', 10);
      await new Promise(r => setTimeout(r, Math.min(retryAfter * 1000, 15000)));
      return callOpenAI(messages, apiKey, retryCount + 1);
    }
    const err = await response.json().catch(() => ({}));
    const errMsg: string = err?.error?.message || '';
    if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('billing')) throw new Error('QUOTA_EXCEEDED');
    throw new Error('RATE_LIMIT');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('INVALID_KEY');
    throw new Error(err?.error?.message || `Hata: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Yanit alinamadi.';
}

function parseError(err: unknown): { message: string; code: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === 'RATE_LIMIT') return { code: 'RATE_LIMIT', message: 'OpenAI istek limiti doldu. 1-2 dakika bekleyip tekrar deneyin.' };
  if (msg === 'QUOTA_EXCEEDED') return { code: 'QUOTA', message: 'OpenAI kota limitine ulasildi. platform.openai.com adresinden kredinizi kontrol edin.' };
  if (msg === 'INVALID_KEY') return { code: 'INVALID_KEY', message: 'API key gecersiz. Ayarlardan yeni key girin.' };
  return { code: 'UNKNOWN', message: msg };
}

interface ParsedAction {
  type: string;
  params: Record<string, unknown>;
}

function parseActionsFromResponse(response: string): ParsedAction[] {
  const actions: ParsedAction[] = [];
  const regex = /```action\s*([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(response)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.type) actions.push(parsed);
    } catch {
    }
  }
  return actions;
}

async function executeAction(action: ParsedAction): Promise<ActionResult> {
  const p = action.params;
  switch (action.type) {
    case 'adjust_balance':
      return adjustUserBalance(String(p.user_id), Number(p.amount), String(p.symbol || 'USDT'), String(p.reason || ''));
    case 'bulk_bonus':
      return bulkBonusDistribution(Number(p.amount), String(p.symbol || 'USDT'), String(p.reason || ''), p.segment ? String(p.segment) : undefined);
    case 'approve_all_withdrawals':
      return approveAllPendingWithdrawals();
    case 'approve_withdrawal':
      return approveWithdrawal(String(p.transaction_id));
    case 'reject_withdrawal':
      return rejectWithdrawal(String(p.transaction_id), String(p.reason || 'Admin tarafindan reddedildi'));
    case 'freeze_user':
      return freezeUser(String(p.user_id), String(p.reason || 'Admin karari'));
    case 'unfreeze_user':
      return unfreezeUser(String(p.user_id));
    case 'close_position':
      return closeFuturesPosition(String(p.position_id), String(p.reason || 'Admin karari'));
    case 'close_high_risk_positions':
      return closeAllHighRiskPositions();
    case 'flag_fraud':
      return flagUserForFraud(String(p.user_id), String(p.reason || ''), Number(p.risk_score || 75));
    case 'close_ticket':
      return closeTicket(String(p.ticket_id), String(p.resolution || 'AI tarafindan kapatildi'));
    case 'get_user_profile':
      return getUserFullProfile(String(p.user_id));
    case 'list_withdrawals':
      return getPendingWithdrawals();
    case 'list_tickets':
      return getOpenSupportTickets();
    case 'list_users':
      return listAllUsers(Number(p.limit) || 100);
    case 'create_rule':
      return createAutomationRule({
        name: String(p.name || 'Yeni Kural'),
        description: String(p.description || ''),
        category: String(p.category || 'system'),
        priority: Number(p.priority || 50),
        trigger_condition: (p.trigger_condition as Record<string, unknown>) || {},
        action: (p.action as Record<string, unknown>) || {},
      });
    default:
      return { success: false, message: `Bilinmeyen aksiyon tipi: ${action.type}` };
  }
}

function stripActionBlocks(response: string): string {
  return response.replace(/```action[\s\S]*?```/g, '').trim();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AIAssistant() {
  const [activePanel, setActivePanel] = useState<Panel>('chat');
  const [messages, setMessages] = useState<Message[]>([{
    id: '0',
    role: 'assistant',
    content: 'Merhaba! Ben platformun Super Yetkili AI Yoneticisiyim.\n\nAşağıdaki tüm sistemlere tam erişimim var:\n• Finansal kontrol (cekim onay/red, bakiye düzenleme)\n• Trading yönetimi (pozisyon kapatma, risk analizi)\n• Güvenlik & fraud tespiti\n• Mining sistemi\n• Destek biletleri\n• Otomasyon kuralları\n• Gerçek zamanlı platform sağlık izleme\n• Ekran görüntüsü analizi & otomatik deploy\n\nBana doğal dilde ne yapmamı istediğini söyle veya ekran görüntüsü yükle.',
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [keys, setKeys] = useState<ApiKeys>(loadKeys);
  const [showApiSetup, setShowApiSetup] = useState(() => !localStorage.getItem('openai_api_key'));
  const [setupStep, setSetupStep] = useState<SetupStep>('openai');
  const [keyInputs, setKeyInputs] = useState({ openai: '', supabaseUrl: '', supabaseServiceKey: '' });
  const [platformContext, setPlatformContext] = useState<PlatformContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [pendingImage, setPendingImage] = useState<{ file: File; base64: string; preview: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  useEffect(() => {
    loadContext();
    loadUnreadAlerts();

    const alertChannel = supabase
      .channel('alerts_badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assistant_alerts' }, () => {
        setUnreadAlerts(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(alertChannel); };
  }, []);

  async function loadContext() {
    setContextLoading(true);
    try {
      const ctx = await fetchFullPlatformContext();
      setPlatformContext(ctx);
    } catch {
    } finally {
      setContextLoading(false);
    }
  }

  async function loadUnreadAlerts() {
    const { count } = await supabase
      .from('assistant_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .eq('is_resolved', false);
    setUnreadAlerts(count || 0);
  }

  const startCountdown = (seconds: number) => {
    setRateLimitCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setRateLimitCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const saveKeys = (step: SetupStep) => {
    if (step === 'openai') {
      const trimmed = keyInputs.openai.trim();
      if (!trimmed.startsWith('sk-')) { alert('Gecersiz OpenAI key. "sk-" ile baslamali.'); return; }
      localStorage.setItem('openai_api_key', trimmed);
      setKeys(prev => ({ ...prev, openai: trimmed }));
      setSetupStep('supabase');
    } else if (step === 'supabase') {
      if (keyInputs.supabaseUrl.trim()) {
        localStorage.setItem('supabase_url_key', keyInputs.supabaseUrl.trim());
      }
      if (keyInputs.supabaseServiceKey.trim()) {
        localStorage.setItem('supabase_service_key', keyInputs.supabaseServiceKey.trim());
      }
      setKeys(loadKeys());
      setShowApiSetup(false);
      setSetupStep('done');
      setKeyInputs({ openai: '', supabaseUrl: '', supabaseServiceKey: '' });
    }
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const base64 = await fileToBase64(file);
    const preview = URL.createObjectURL(file);
    setPendingImage({ file, base64, preview });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) handleImageFile(file);
        break;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleDeployAction = async (msgId: string, analysis: VisionAnalysis) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, deployStatus: 'deploying', deployMessage: 'Deploy ediliyor...' } : m
    ));

    try {
      if (analysis.problem_type === 'database' && analysis.sql_migration) {
        const result = await runSQLMigration(
          analysis.sql_migration,
          `vision_fix_${Date.now()}`
        );
        setMessages(prev => prev.map(m =>
          m.id === msgId ? {
            ...m,
            deployStatus: result.success ? 'success' : 'failed',
            deployMessage: result.success
              ? 'Migration basariyla uygulandı!'
              : `Hata: ${result.details || result.message}`
          } : m
        ));
      } else if (analysis.problem_type === 'edge_function' && analysis.edge_function_code && analysis.edge_function_name) {
        if (!keys.supabaseUrl || !keys.supabaseServiceKey) {
          setMessages(prev => prev.map(m =>
            m.id === msgId ? {
              ...m,
              deployStatus: 'failed',
              deployMessage: 'Supabase URL ve Service Key gerekli. Ayarlardan ekleyin.'
            } : m
          ));
          return;
        }
        const result = await deployEdgeFunctionViaAPI(
          analysis.edge_function_name,
          analysis.edge_function_code,
          keys.supabaseUrl,
          keys.supabaseServiceKey
        );
        setMessages(prev => prev.map(m =>
          m.id === msgId ? {
            ...m,
            deployStatus: result.success ? 'success' : 'failed',
            deployMessage: result.success
              ? `Edge function deploy edildi: ${analysis.edge_function_name}`
              : `Hata: ${result.details || result.message}`
          } : m
        ));
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === msgId ? {
          ...m,
          deployStatus: 'failed',
          deployMessage: `Deploy hatasi: ${String(err)}`
        } : m
      ));
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = text || input.trim();
    const hasImg = !!pendingImage;

    if ((!messageText && !hasImg) || loading || rateLimitCountdown > 0) return;
    if (!keys.openai) { setShowApiSetup(true); return; }

    const displayText = messageText || (hasImg ? 'Bu ekran goruntusundeki sorunu coz.' : '');
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: displayText,
      timestamp: new Date(),
      hasImage: hasImg,
      imagePreview: pendingImage?.preview,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const capturedImage = pendingImage;
    setPendingImage(null);
    setLoading(true);

    if (activePanel !== 'chat') setActivePanel('chat');

    try {
      if (capturedImage) {
        const visionResponse = await analyzeScreenshotWithVision(
          capturedImage.base64,
          messageText || 'Bu ekran goruntusundeki sorunu tespit et ve coz.',
          keys.openai
        );

        const analysis = parseVisionResponse(visionResponse);
        const msgId = (Date.now() + 1).toString();

        setMessages(prev => [...prev, {
          id: msgId,
          role: 'assistant',
          content: visionResponse,
          timestamp: new Date(),
          visionAnalysis: analysis,
          deployStatus: analysis.auto_deployable ? 'pending' : undefined,
        }]);

        await logAction({
          action_type: 'vision_analysis',
          category: 'system',
          description: `Vision AI: ${analysis.problem_type} sorunu tespit edildi`,
          parameters: { problem_type: analysis.problem_type, auto_deployable: analysis.auto_deployable },
          status: 'success',
        });

        if (analysis.auto_deployable) {
          await handleDeployAction(msgId, analysis);
        }

      } else {
        let ctx = platformContext;
        if (!ctx) {
          ctx = await fetchFullPlatformContext();
          setPlatformContext(ctx);
        }

        const systemPrompt = buildSystemPrompt(ctx);
        const conversationHistory = messages.slice(-8).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }));
        const apiMessages = [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: messageText },
        ];

        const rawResponse = await callOpenAI(apiMessages, keys.openai);

        const parsedActions = parseActionsFromResponse(rawResponse);
        const cleanResponse = stripActionBlocks(rawResponse);

        const actionResults: string[] = [];
        if (parsedActions.length > 0) {
          for (const action of parsedActions) {
            const result = await executeAction(action);
            actionResults.push(`[${action.type}] ${result.success ? '✓' : '✗'} ${result.message}${result.affected !== undefined ? ` (${result.affected} kayit)` : ''}`);
            if (result.data && action.type === 'list_withdrawals' && result.data.withdrawals) {
              const wds = result.data.withdrawals as Array<Record<string, unknown>>;
              if (wds.length > 0) {
                actionResults.push(wds.slice(0, 10).map(w => `  • ${w.id} | ${w.amount} ${w.symbol} | ${new Date(String(w.created_at)).toLocaleString('tr-TR')}`).join('\n'));
              }
            }
            if (result.data && action.type === 'list_tickets' && result.data.tickets) {
              const tks = result.data.tickets as Array<Record<string, unknown>>;
              if (tks.length > 0) {
                actionResults.push(tks.slice(0, 10).map(t => `  • ${t.id} | ${t.subject} | ${t.priority} | ${new Date(String(t.created_at)).toLocaleString('tr-TR')}`).join('\n'));
              }
            }
            if (result.data && action.type === 'list_users' && result.data.users) {
              const us = result.data.users as Array<Record<string, unknown>>;
              if (us.length > 0) {
                actionResults.push(`  Toplam: ${result.data.count} kullanici\n` + us.slice(0, 100).map(u => `  • #${u.user_id || '-'} | ${u.email || '-'} | ${u.full_name || '-'} | Seviye: ${u.user_level || 1} | ${u.is_active ? 'Aktif' : 'Donuk'}${u.is_admin ? ' [ADMIN]' : ''} | ${new Date(String(u.created_at)).toLocaleDateString('tr-TR')}`).join('\n'));
              }
            }
            if (result.data && action.type === 'get_user_profile' && result.data.profile) {
              const d = result.data;
              actionResults.push(`  Bakiye: $${Number(d.total_usdt).toFixed(2)} | Deposit: $${Number(d.total_deposits).toFixed(2)} | Cekim: $${Number(d.total_withdrawals).toFixed(2)}\n  Acik Pozisyon: ${d.open_positions} | Mining: ${d.active_mining} | Risk Skoru: ${d.max_risk_score}`);
            }
          }
        }

        const finalContent = actionResults.length > 0
          ? `${cleanResponse}\n\n--- UYGULANAN AKSIYONLAR ---\n${actionResults.join('\n')}`
          : cleanResponse;

        const { data: cmdData } = await supabase.from('assistant_natural_commands').insert({
          user_id: (await getCurrentUser())?.id,
          raw_command: messageText,
          interpreted_intent: messageText.slice(0, 100),
          actions_taken: parsedActions.map(a => a.type),
          result_summary: finalContent.slice(0, 200),
          status: 'completed',
        }).select().single();

        await logAction({
          action_type: 'natural_language_command',
          category: 'system',
          description: `AI komut: "${messageText.slice(0, 60)}" | ${parsedActions.length} aksiyon`,
          parameters: { command: messageText, command_id: cmdData?.id, actions: parsedActions.map(a => a.type) },
          result: { response_length: rawResponse.length, actions_executed: parsedActions.length },
          status: 'success',
        });

        if (ctx.health_score < 50 && !messages.some(m => m.content.includes('saglik skoru'))) {
          await createAlert({
            title: 'Dusuk Platform Saglik Skoru',
            message: `Platform saglik skoru ${ctx.health_score}/100. Acil inceleme gerekebilir.`,
            priority: ctx.health_score < 30 ? 'critical' : 'high',
            category: 'system',
            data: { health_score: ctx.health_score, issues: ctx.issues },
            action_required: ctx.health_score < 30,
          });
        }

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: finalContent,
          timestamp: new Date(),
          actionsTaken: parsedActions.map(a => a.type),
        }]);
      }
    } catch (err) {
      const { message, code } = parseError(err);
      if (code === 'RATE_LIMIT') startCountdown(60);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: message,
        timestamp: new Date(),
        isError: true,
        retryPayload: code === 'RATE_LIMIT' ? { text: messageText } : undefined,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, rateLimitCountdown, keys, messages, platformContext, activePanel, pendingImage]);

  const clearChat = () => {
    setMessages([{
      id: '0',
      role: 'assistant',
      content: 'Sohbet temizlendi. Ne yapmamı istersiniz?',
      timestamp: new Date(),
    }]);
  };

  if (showApiSetup) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <div className="w-full max-w-lg bg-[#1E2329] rounded-2xl border border-[#2B3139] p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#F0B90B]/10 rounded-xl flex items-center justify-center relative">
              <Bot className="w-6 h-6 text-[#F0B90B]" />
              <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Super Yetkili AI Yoneticisi</h3>
              <p className="text-gray-400 text-sm">Vision AI · Otomatik Deploy · Tam Platform Kontrolu</p>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            {[
              { step: 'openai', label: 'OpenAI Key', icon: Key },
              { step: 'supabase', label: 'Supabase Keys', icon: Database },
            ].map((s, i) => {
              const Icon = s.icon;
              const isActive = setupStep === s.step;
              const isDone = setupStep === 'supabase' && i === 0;
              return (
                <div key={s.step} className={`flex-1 flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  isActive ? 'border-[#F0B90B] bg-[#F0B90B]/10 text-[#F0B90B]' :
                  isDone ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                  'border-[#2B3139] text-gray-500'
                }`}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  {s.label}
                </div>
              );
            })}
          </div>

          {setupStep === 'openai' && (
            <>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {[
                  { icon: DollarSign, label: 'Finansal Kontrol', color: 'text-emerald-400 bg-emerald-500/10' },
                  { icon: ShieldAlert, label: 'Fraud Tespiti', color: 'text-red-400 bg-red-500/10' },
                  { icon: Image, label: 'Vision AI Analiz', color: 'text-blue-400 bg-blue-500/10' },
                  { icon: Play, label: 'Otomatik Deploy', color: 'text-amber-400 bg-amber-500/10' },
                  { icon: Shield, label: 'Kural Motoru', color: 'text-teal-400 bg-teal-500/10' },
                  { icon: Calendar, label: 'Zamanli Gorevler', color: 'text-cyan-400 bg-cyan-500/10' },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className={`flex items-center gap-2 p-2.5 rounded-xl border border-white/5 ${item.color.split(' ')[1]}`}>
                      <Icon className={`w-4 h-4 ${item.color.split(' ')[0]}`} />
                      <span className="text-xs text-gray-300 font-medium">{item.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="bg-[#2B3139] rounded-xl p-4 mb-5 space-y-2 text-sm text-gray-400">
                <p className="text-white font-medium text-sm">OpenAI API key gerekli</p>
                <div className="space-y-1 text-xs">
                  <p className="flex items-center gap-2"><ChevronRight className="w-3 h-3" /> platform.openai.com adresine gidin</p>
                  <p className="flex items-center gap-2"><ChevronRight className="w-3 h-3" /> API Keys bolumunden yeni key olusturun</p>
                  <p className="flex items-center gap-2"><ChevronRight className="w-3 h-3" /> GPT-4o modeline erisim gerekli (Vision icin)</p>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="password"
                  value={keyInputs.openai}
                  onChange={e => setKeyInputs(prev => ({ ...prev, openai: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && saveKeys('openai')}
                  placeholder="sk-proj-..."
                  className="w-full bg-[#2B3139] border border-[#363C45] rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#F0B90B] transition-colors font-mono"
                />
                <button
                  onClick={() => saveKeys('openai')}
                  disabled={!keyInputs.openai.trim()}
                  className="w-full bg-[#F0B90B] text-[#181A20] rounded-xl py-3 font-bold text-sm hover:bg-[#d4a20a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  Devam Et
                </button>
              </div>
            </>
          )}

          {setupStep === 'supabase' && (
            <>
              <div className="bg-[#2B3139] rounded-xl p-4 mb-5 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-emerald-400 text-sm font-medium">OpenAI key kaydedildi</p>
                </div>
                <div className="border-t border-[#363C45] pt-3 mt-2">
                  <p className="text-white font-medium text-sm mb-2">Supabase Keyleri (Opsiyonel)</p>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Edge Function otomatik deploy icin Supabase Management API key gerekli.
                    Eklemeseniz bile AI analiz yapar, sadece otomatik deploy calismaz.
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Supabase Project URL</label>
                  <input
                    type="text"
                    value={keyInputs.supabaseUrl}
                    onChange={e => setKeyInputs(prev => ({ ...prev, supabaseUrl: e.target.value }))}
                    placeholder="https://xxxx.supabase.co"
                    className="w-full bg-[#2B3139] border border-[#363C45] rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#F0B90B] transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Service Role Key</label>
                  <input
                    type="password"
                    value={keyInputs.supabaseServiceKey}
                    onChange={e => setKeyInputs(prev => ({ ...prev, supabaseServiceKey: e.target.value }))}
                    placeholder="eyJhbGc..."
                    className="w-full bg-[#2B3139] border border-[#363C45] rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#F0B90B] transition-colors font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">Supabase Dashboard {'>'} Settings {'>'} API {'>'} service_role</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowApiSetup(false); setSetupStep('done'); }}
                  className="flex-1 bg-[#2B3139] text-gray-300 rounded-xl py-3 font-medium text-sm hover:bg-[#363C45] transition-colors"
                >
                  Atla
                </button>
                <button
                  onClick={() => saveKeys('supabase')}
                  className="flex-1 bg-[#F0B90B] text-[#181A20] rounded-xl py-3 font-bold text-sm hover:bg-[#d4a20a] transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Aktifestir
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: '600px' }}>
      <div className="mb-4 flex-shrink-0">
        <div className="flex gap-1 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {PANEL_CONFIG.map(panel => {
            const Icon = panel.icon;
            const isActive = activePanel === panel.key;
            const hasAlert = panel.key === 'alerts' && unreadAlerts > 0;
            const hasFraud = panel.key === 'fraud' && platformContext && platformContext.fraud.open_flags > 0;

            return (
              <button
                key={panel.key}
                onClick={() => setActivePanel(panel.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all relative flex-shrink-0 ${
                  isActive
                    ? 'bg-[#F0B90B] text-[#181A20]'
                    : 'bg-[#1E2329] text-gray-400 hover:text-white hover:bg-[#2B3139] border border-[#2B3139]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[#181A20]' : panel.color}`} />
                {panel.label}
                {(hasAlert || hasFraud) && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 absolute -top-0.5 -right-0.5 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={loadContext}
            disabled={contextLoading}
            className="p-1.5 rounded-lg hover:bg-[#2B3139] transition-colors"
            title="Veriyi yenile"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${contextLoading ? 'animate-spin' : ''}`} />
          </button>
          {platformContext && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
              platformContext.health_score >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
              platformContext.health_score >= 60 ? 'bg-amber-500/10 text-amber-400' :
              'bg-red-500/10 text-red-400'
            }`}>
              <Activity className="w-3 h-3" />
              {platformContext.health_score}
            </div>
          )}
          <button
            onClick={() => { setShowApiSetup(true); setSetupStep('openai'); }}
            className="p-1.5 rounded-lg hover:bg-[#2B3139] transition-colors"
            title="API Keys degistir"
          >
            <Lock className={`w-3.5 h-3.5 ${keys.supabaseServiceKey ? 'text-emerald-500' : 'text-gray-500'}`} />
          </button>
          <button
            onClick={() => { localStorage.removeItem('openai_api_key'); setKeys(prev => ({ ...prev, openai: '' })); setShowApiSetup(true); setSetupStep('openai'); }}
            className="p-1.5 rounded-lg hover:bg-[#2B3139] transition-colors"
            title="API Key degistir"
          >
            <Settings2 className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activePanel === 'chat' && (
          <div className="flex flex-col h-full">
            <div
              ref={chatContainerRef}
              className={`flex-1 overflow-y-auto bg-[#1E2329] rounded-xl border transition-colors ${
                isDragging ? 'border-[#F0B90B] bg-[#F0B90B]/5' : 'border-[#2B3139]'
              } p-4 space-y-3 mb-3`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="absolute inset-4 flex items-center justify-center bg-[#1E2329]/90 rounded-xl border-2 border-dashed border-[#F0B90B] z-10 pointer-events-none">
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-[#F0B90B] mx-auto mb-2" />
                    <p className="text-[#F0B90B] font-medium text-sm">Goruntu birakın</p>
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    msg.role === 'user' ? 'bg-[#F0B90B]/15' : msg.isError ? 'bg-red-500/10' : 'bg-[#F0B90B]/8'
                  }`}>
                    {msg.role === 'user'
                      ? <User className="w-3.5 h-3.5 text-[#F0B90B]" />
                      : msg.isError
                        ? <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        : <Bot className="w-3.5 h-3.5 text-[#F0B90B]" />
                    }
                  </div>
                  <div className={`max-w-[84%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.hasImage && msg.imagePreview && (
                      <div className="mb-2 rounded-xl overflow-hidden border border-[#363C45] max-w-[200px]">
                        <img src={msg.imagePreview} alt="Yuklenen goruntu" className="w-full object-cover" />
                        <div className="bg-[#2B3139] px-2 py-1 flex items-center gap-1">
                          <Eye className="w-3 h-3 text-[#F0B90B]" />
                          <span className="text-xs text-gray-400">Vision AI analiz</span>
                        </div>
                      </div>
                    )}

                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[#F0B90B] text-[#181A20] font-medium rounded-tr-sm'
                        : msg.isError
                          ? 'bg-red-500/8 border border-red-500/20 text-red-300 rounded-tl-sm'
                          : 'bg-[#2B3139] text-gray-100 rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>

                    {msg.visionAnalysis && (
                      <div className="mt-2 w-full space-y-2">
                        {(() => {
                          const typeInfo = PROBLEM_TYPE_LABELS[msg.visionAnalysis.problem_type];
                          const TypeIcon = typeInfo.icon;
                          return (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${typeInfo.color}`}>
                              <TypeIcon className="w-3.5 h-3.5" />
                              {typeInfo.label} Sorunu
                            </div>
                          );
                        })()}

                        {msg.visionAnalysis.sql_migration && (
                          <div className="bg-[#181A20] rounded-xl border border-[#363C45] overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-[#363C45]">
                              <div className="flex items-center gap-2">
                                <Database className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-xs text-gray-400 font-medium">SQL Migration</span>
                              </div>
                              <button
                                onClick={() => copyCode(msg.visionAnalysis!.sql_migration!)}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
                              >
                                {copiedCode === msg.visionAnalysis.sql_migration ? (
                                  <><CheckCircle2 className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Kopyalandi</span></>
                                ) : (
                                  <><Copy className="w-3 h-3" />Kopyala</>
                                )}
                              </button>
                            </div>
                            <pre className="p-3 text-xs text-emerald-300 overflow-x-auto max-h-32 font-mono">
                              {msg.visionAnalysis.sql_migration}
                            </pre>
                          </div>
                        )}

                        {(msg.visionAnalysis.edge_function_code || msg.visionAnalysis.frontend_code) && (
                          <div className="bg-[#181A20] rounded-xl border border-[#363C45] overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-[#363C45]">
                              <div className="flex items-center gap-2">
                                <Code2 className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-xs text-gray-400 font-medium">
                                  {msg.visionAnalysis.edge_function_name
                                    ? `Edge Function: ${msg.visionAnalysis.edge_function_name}`
                                    : msg.visionAnalysis.file_path || 'Kod'}
                                </span>
                              </div>
                              <button
                                onClick={() => copyCode(msg.visionAnalysis!.edge_function_code || msg.visionAnalysis!.frontend_code || '')}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
                              >
                                <Copy className="w-3 h-3" />Kopyala
                              </button>
                            </div>
                            <pre className="p-3 text-xs text-amber-200 overflow-x-auto max-h-32 font-mono">
                              {msg.visionAnalysis.edge_function_code || msg.visionAnalysis.frontend_code}
                            </pre>
                          </div>
                        )}

                        {msg.visionAnalysis.auto_deployable && (
                          <div className="flex items-center gap-2">
                            {msg.deployStatus === 'pending' && (
                              <button
                                onClick={() => handleDeployAction(msg.id, msg.visionAnalysis!)}
                                className="flex items-center gap-2 px-3 py-2 bg-[#F0B90B] text-[#181A20] rounded-xl text-xs font-bold hover:bg-[#d4a20a] transition-colors"
                              >
                                <Play className="w-3.5 h-3.5" />
                                Otomatik Deploy Et
                              </button>
                            )}
                            {msg.deployStatus === 'deploying' && (
                              <div className="flex items-center gap-2 px-3 py-2 bg-[#2B3139] rounded-xl text-xs text-gray-300">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F0B90B]" />
                                Deploy ediliyor...
                              </div>
                            )}
                            {msg.deployStatus === 'success' && (
                              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {msg.deployMessage}
                              </div>
                            )}
                            {msg.deployStatus === 'failed' && (
                              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {msg.deployMessage}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {msg.actionsTaken && msg.actionsTaken.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {msg.actionsTaken.map((a, i) => (
                          <span key={i} className="flex items-center gap-1 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {a}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[10px] text-gray-600">
                        {msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.isError && msg.retryPayload && rateLimitCountdown === 0 && (
                        <button onClick={() => sendMessage(msg.retryPayload!.text)} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors">
                          <RefreshCw className="w-3 h-3" />
                          Tekrar dene
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-[#F0B90B]/8 flex items-center justify-center mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-[#F0B90B]" />
                  </div>
                  <div className="bg-[#2B3139] rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-[#F0B90B] animate-spin" />
                    <span className="text-gray-400 text-sm">
                      {pendingImage ? 'Goruntu analiz ediliyor...' : 'Analiz ediliyor...'}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {messages.length <= 1 && (
              <div className="mb-3 flex-shrink-0">
                <p className="text-xs text-gray-600 mb-2">Hizli komutlar:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUICK_COMMANDS.slice(0, 6).map(cmd => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.label}
                        onClick={() => sendMessage(cmd.prompt)}
                        disabled={loading}
                        className="flex items-center gap-2 text-left px-3 py-2 bg-[#1E2329] border border-[#2B3139] rounded-xl text-xs text-gray-400 hover:border-[#F0B90B]/30 hover:text-white hover:bg-[#2B3139] transition-all disabled:opacity-40"
                      >
                        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${cmd.color}`} />
                        {cmd.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {pendingImage && (
              <div className="mb-2 flex-shrink-0">
                <div className="flex items-center gap-2 p-2 bg-[#1E2329] border border-[#F0B90B]/30 rounded-xl">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-[#363C45]">
                    <img src={pendingImage.preview} alt="Bekleyen goruntu" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#F0B90B] font-medium">Goruntu hazir</p>
                    <p className="text-xs text-gray-500 truncate">{pendingImage.file.name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">Vision AI ile analiz edilecek</span>
                  </div>
                  <button onClick={() => setPendingImage(null)} className="p-1 hover:bg-[#363C45] rounded-lg transition-colors">
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={clearChat}
                className="p-2.5 rounded-xl bg-[#1E2329] border border-[#2B3139] text-gray-500 hover:text-white hover:border-[#363C45] transition-all"
                title="Sohbeti temizle"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-2.5 rounded-xl border transition-all ${
                  pendingImage
                    ? 'bg-[#F0B90B]/10 border-[#F0B90B]/30 text-[#F0B90B]'
                    : 'bg-[#1E2329] border-[#2B3139] text-gray-500 hover:text-white hover:border-[#363C45]'
                }`}
                title="Ekran goruntusu yukle (veya Ctrl+V ile yapistir)"
              >
                <Image className="w-4 h-4" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={
                    rateLimitCountdown > 0
                      ? `${rateLimitCountdown}s bekleyin...`
                      : pendingImage
                        ? 'Goruntu hakkinda soru yaz (opsiyonel)...'
                        : 'Platforma komut ver veya ekran goruntusu yapistir (Ctrl+V)...'
                  }
                  disabled={loading || rateLimitCountdown > 0}
                  className="w-full bg-[#1E2329] border border-[#2B3139] rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#F0B90B]/50 transition-colors disabled:opacity-50"
                />
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={loading || (!input.trim() && !pendingImage) || rateLimitCountdown > 0}
                className="px-4 py-2.5 bg-[#F0B90B] text-[#181A20] rounded-xl font-bold hover:bg-[#d4a20a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>

            <div className="mt-2 flex items-center gap-3 flex-shrink-0">
              <p className="text-[10px] text-gray-600">
                Goruntu: Dosya sec, Ctrl+V yapistir veya surukle birak
              </p>
              {keys.supabaseServiceKey ? (
                <div className="flex items-center gap-1 ml-auto">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400">Otomatik deploy aktif</span>
                </div>
              ) : (
                <button
                  onClick={() => { setShowApiSetup(true); setSetupStep('supabase'); }}
                  className="flex items-center gap-1 ml-auto text-[10px] text-gray-500 hover:text-amber-400 transition-colors"
                >
                  <Key className="w-3 h-3" />
                  Deploy key ekle
                </button>
              )}
            </div>

            {messages.length > 2 && (
              <div className="mt-2 flex-shrink-0">
                <div className="flex gap-1.5 flex-wrap">
                  {QUICK_COMMANDS.slice(6).map(cmd => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.label}
                        onClick={() => sendMessage(cmd.prompt)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1E2329] border border-[#2B3139] rounded-lg text-xs text-gray-400 hover:border-[#F0B90B]/30 hover:text-white transition-all disabled:opacity-40"
                      >
                        <Icon className={`w-3 h-3 ${cmd.color}`} />
                        {cmd.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activePanel === 'health' && platformContext && (
          <div className="overflow-y-auto h-full pr-1">
            <AssistantHealthPanel context={platformContext} onRefresh={loadContext} loading={contextLoading} />
          </div>
        )}

        {activePanel === 'health' && !platformContext && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-[#F0B90B] animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Platform verileri yukleniyor...</p>
            </div>
          </div>
        )}

        {activePanel === 'rules' && (
          <div className="overflow-y-auto h-full pr-1">
            <AssistantRulesPanel />
          </div>
        )}

        {activePanel === 'alerts' && (
          <div className="overflow-y-auto h-full pr-1">
            <AssistantAlertsPanel />
          </div>
        )}

        {activePanel === 'scheduled' && (
          <div className="overflow-y-auto h-full pr-1">
            <AssistantScheduledPanel />
          </div>
        )}

        {activePanel === 'fraud' && (
          <div className="overflow-y-auto h-full pr-1">
            <AssistantFraudPanel />
          </div>
        )}

        {activePanel === 'logs' && (
          <div className="overflow-y-auto h-full pr-1">
            <AssistantActionsLog />
          </div>
        )}
      </div>
    </div>
  );
}
