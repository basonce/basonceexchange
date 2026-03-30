import { useEffect, useState, useRef } from 'react';
import { RefreshCw, Send, X, MessageSquare, Clock, ChevronDown, ChevronUp, Sparkles, User, Wallet, Shield, Zap, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  fetchSupportTickets,
  fetchSupportMessages,
  sendSupportReply,
  closeSupportTicket,
  markMessagesRead,
  fetchUnreadSupportCount,
  fetchTicketUserProfile,
  generateAISupportDraft,
} from '../lib/admin-api';

interface Ticket {
  id: string;
  subject?: string;
  status: string;
  created_at: string;
  customer_id?: string;
  user_profiles?: { email: string; full_name: string };
  last_message?: { message: string; sender_type: string; created_at: string } | null;
}
interface Message { id: string; ticket_id?: string; message: string; sender_type: string; created_at: string; read: boolean; }

const URGENCY_CRITICAL_WORDS = ['acil', 'hemen', 'param kayboldu', 'para kayboldu', 'lost my money', 'funds gone', 'saatlerdir', 'günlerdir', 'urgent', 'scam', 'dolandırıldım', 'fraud', 'hack', 'stolen'];
const URGENCY_HIGH_WORDS = ['çekilmiyor', 'çekemiyorum', 'cannot withdraw', 'gelmedi', 'not arrived', 'sorun var', 'hata', 'error', 'blok', 'freeze', 'blocked'];

function detectUrgency(ticket: Ticket, messages: Message[]): 'critical' | 'high' | 'normal' {
  const allText = [
    ticket.subject || '',
    ticket.last_message?.message || '',
    ...messages.map(m => m.message),
  ].join(' ').toLowerCase();
  if (URGENCY_CRITICAL_WORDS.some(w => allText.includes(w))) return 'critical';
  if (URGENCY_HIGH_WORDS.some(w => allText.includes(w))) return 'high';
  return 'normal';
}

const QUICK_REPLIES_TR = [
  { label: 'KYC Gerekli', text: 'Çekim yapabilmek için KYC doğrulamanızı tamamlamanız gerekmektedir. Profile > Identity Verification bölümüne giderek kimlik belgelerinizi yükleyebilirsiniz. Onay süresi 1-3 iş günüdür.' },
  { label: 'Çekim Süreci', text: 'Çekim talebiniz güvenlik inceleme sürecindedir. Bu normal bir süreçtir ve 1-24 saat içinde tamamlanmaktadır. 24 saati geçtiği takdirde lütfen işlem ID\'nizi paylaşın.' },
  { label: 'Para Yatırma', text: 'Para yatırma işleminiz 5-30 dakika içinde sisteme yansımaktadır. TX Hash\'inizi (işlem numaranızı) paylaşırsanız durumu kontrol edebilirim.' },
  { label: 'Bakiye Kilidi', text: 'Bakiyenizin bir kısmı açık emirler veya futures pozisyonlarınız nedeniyle kilitli olabilir. Assets > Transaction History bölümünden tüm hareketlerinizi görebilirsiniz.' },
  { label: 'Mining', text: 'EQ tokenlarınızı USDT\'ye çevirmek için Mining > Swap bölümünü kullanabilirsiniz. İşlem anlık gerçekleşir.' },
  { label: 'İnceleniyor', text: 'Talebiniz incelemeye alınmıştır. En kısa sürede geri dönüş yapılacaktır. Anlayışınız için teşekkür ederiz.' },
  { label: 'Çözüldü', text: 'Sorununuz çözülmüştür. Başka bir konuda yardımcı olabilir miyim?' },
];

function timeAgo(dt: string) {
  const d = Date.now() - new Date(dt).getTime();
  if (d < 60000) return 'şimdi';
  if (d < 3600000) return `${Math.floor(d / 60000)} dk`;
  if (d < 86400000) return `${Math.floor(d / 3600000)} sa`;
  return `${Math.floor(d / 86400000)} gün`;
}

const STATUS_COLOR: Record<string, string> = { open: '#F0B90B', answered: '#3D7FFF', closed: '#555', pending: '#FF9800' };
const STATUS_LABEL: Record<string, string> = { open: 'Açık', answered: 'Yanıtlandı', closed: 'Kapalı', pending: 'Bekliyor' };

export default function Support() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'answered' | 'closed'>('all');
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<{ profile: any; balances: any[] } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel('support-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => { load(true); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
        const msg = payload.new as Message;
        if (selected && msg.ticket_id === (selected as any).id) {
          setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.sender_type === 'customer') {
            markMessagesRead((selected as any).id);
          }
        }
        if (msg.sender_type === 'customer') {
          setUnread(u => u + 1);
          load(true);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    const [t, u] = await Promise.all([fetchSupportTickets(), fetchUnreadSupportCount()]);
    setTickets(t);
    setUnread(u);
    if (!silent) setLoading(false);
  }

  async function openTicket(t: Ticket) {
    setSelected(t);
    setMsgLoading(true);
    setCustomerProfile(null);
    setReply('');
    setShowQuickReplies(false);

    const [msgs] = await Promise.all([
      fetchSupportMessages(t.id),
    ]);
    setMessages(msgs);
    setMsgLoading(false);
    await markMessagesRead(t.id);
    setUnread(u => Math.max(0, u - msgs.filter((m: Message) => !m.read && m.sender_type === 'customer').length));

    if (t.customer_id) {
      setProfileLoading(true);
      const p = await fetchTicketUserProfile(t.customer_id);
      setCustomerProfile(p);
      setProfileLoading(false);
    }
  }

  async function doReply() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      await sendSupportReply(selected.id, reply.trim());
      const msgs = await fetchSupportMessages(selected.id);
      setMessages(msgs);
      setReply('');
      setTickets(ts => ts.map(t => t.id === selected.id ? { ...t, status: 'answered' } : t));
      showToast('✅ Mesaj gönderildi');
    } catch { showToast('❌ Hata oluştu'); }
    setSending(false);
  }

  async function doAIDraft() {
    if (!messages.length) return;
    setAiDraftLoading(true);
    try {
      const conv = messages.map(m => ({
        role: m.sender_type === 'customer' ? 'user' as const : 'assistant' as const,
        content: m.message,
      }));
      const lang = detectLanguageFromMessages(messages);
      const draft = await generateAISupportDraft(conv, lang, 'Support Agent');
      if (draft) {
        setReply(draft);
        showToast('✨ AI taslak hazırlandı');
      } else {
        showToast('⚠️ AI şu an yanıt veremedi');
      }
    } catch { showToast('❌ AI bağlantı hatası'); }
    setAiDraftLoading(false);
  }

  function detectLanguageFromMessages(msgs: Message[]): string {
    const text = msgs.filter(m => m.sender_type === 'customer').map(m => m.message).join(' ');
    if (/[çşğıöüÇŞĞİÖÜ]/.test(text)) return 'tr';
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
    return 'en';
  }

  async function doClose() {
    if (!selected) return;
    await closeSupportTicket(selected.id);
    setTickets(ts => ts.map(t => t.id === selected.id ? { ...t, status: 'closed' } : t));
    setSelected(null);
    showToast('🔒 Ticket kapatıldı');
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  const filtered = tickets.filter(t => filter === 'all' || t.status === filter);

  const urgency = selected ? detectUrgency(selected, messages) : 'normal';

  const usdtBal = customerProfile?.balances?.find((b: any) => b.symbol === 'USDT');

  return (
    <div className="flex flex-col pb-28">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-2xl text-sm font-medium text-white"
          style={{ background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
          {toast}
        </div>
      )}

      <div className="p-4 pt-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: '#F0B90B', letterSpacing: '0.08em' }}>DESTEK YÖNETİMİ</p>
            <h1 className="text-2xl font-black text-white">Destek</h1>
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full animate-pulse" style={{ background: '#FF4757', color: 'white' }}>{unread} yeni</span>
            )}
            <button onClick={() => load()} className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} color="rgba(255,255,255,0.6)" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: 'Toplam', val: tickets.length, color: 'rgba(255,255,255,0.6)' },
            { label: 'Açık', val: tickets.filter(t => t.status === 'open').length, color: '#F0B90B' },
            { label: 'Yanıtlandı', val: tickets.filter(t => t.status === 'answered').length, color: '#3D7FFF' },
            { label: 'Kapalı', val: tickets.filter(t => t.status === 'closed').length, color: 'rgba(255,255,255,0.25)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-base font-bold" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {(['all', 'open', 'answered', 'closed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="flex-none px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: filter === f ? 'rgba(240,185,11,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${filter === f ? 'rgba(240,185,11,0.3)' : 'rgba(255,255,255,0.07)'}`,
                color: filter === f ? '#F0B90B' : 'rgba(255,255,255,0.4)',
              }}>
              {f === 'all' ? 'Tümü' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>

        {loading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton rounded-2xl h-24" />) :
          filtered.length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(0,220,130,0.04)', border: '1px solid rgba(0,220,130,0.1)' }}>
              <p className="text-2xl mb-2">📭</p>
              <p className="text-sm" style={{ color: '#00DC82' }}>Ticket bulunamadı</p>
            </div>
          ) : filtered.map(t => {
            const urg = detectUrgency(t, []);
            return (
              <button key={t.id} onClick={() => openTicket(t)}
                className="rounded-2xl p-4 flex items-start gap-3 text-left active:scale-[0.98] transition-transform w-full"
                style={{
                  background: t.status === 'open' ? 'rgba(240,185,11,0.04)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${t.status === 'open' ? 'rgba(240,185,11,0.15)' : 'rgba(255,255,255,0.07)'}`,
                }}>
                <div className="relative flex-none">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: t.status === 'open' ? 'rgba(240,185,11,0.15)' : 'rgba(255,255,255,0.08)' }}>
                    <MessageSquare size={16} color={STATUS_COLOR[t.status] || '#888'} />
                  </div>
                  {urg === 'critical' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-black animate-pulse" />
                  )}
                  {urg === 'high' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border border-black" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-white truncate">
                      {urg === 'critical' && <span className="text-red-400 mr-1">🔴</span>}
                      {urg === 'high' && <span className="text-orange-400 mr-1">🟠</span>}
                      {t.subject || t.user_profiles?.email?.split('@')[0] || 'Destek Talebi'}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-none" style={{ background: `${STATUS_COLOR[t.status] || '#888'}22`, color: STATUS_COLOR[t.status] || '#888' }}>
                      {STATUS_LABEL[t.status] || t.status}
                    </span>
                  </div>
                  <p className="text-xs truncate mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {t.user_profiles?.full_name || t.user_profiles?.email || 'Bilinmeyen'} · ID: {t.customer_id || '-'}
                  </p>
                  {t.last_message && (
                    <p className="text-[11px] truncate" style={{ color: t.last_message.sender_type === 'customer' ? 'rgba(240,185,11,0.8)' : 'rgba(255,255,255,0.3)' }}>
                      {t.last_message.sender_type === 'customer' ? '👤 ' : '🤖 '}{t.last_message.message}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <Clock size={9} color="rgba(255,255,255,0.2)" />
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{timeAgo(t.created_at)} önce</span>
                  </div>
                </div>
              </button>
            );
          })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="absolute inset-x-0 bottom-0 top-16 max-w-[430px] mx-auto rounded-t-3xl flex flex-col"
            style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}>

            <div className="flex items-center gap-3 p-4 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: urgency === 'critical' ? 'rgba(255,71,87,0.2)' : urgency === 'high' ? 'rgba(255,152,0,0.2)' : 'rgba(240,185,11,0.15)' }}>
                {urgency === 'critical' ? <AlertTriangle size={16} color="#FF4757" /> : <MessageSquare size={16} color="#F0B90B" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {urgency === 'critical' && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">🔴 ACİL</span>}
                  {urgency === 'high' && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">🟠 ÖNCELİKLİ</span>}
                  <p className="text-sm font-bold text-white truncate">{selected.subject || 'Destek Talebi'}</p>
                </div>
                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{selected.user_profiles?.email} · #{selected.id.slice(0, 8)}</p>
              </div>
              <div className="flex items-center gap-2">
                {selected.status !== 'closed' && (
                  <button onClick={doClose} className="px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>Kapat</button>
                )}
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <X size={15} color="rgba(255,255,255,0.6)" />
                </button>
              </div>
            </div>

            {(customerProfile || profileLoading) && (
              <div className="flex-shrink-0 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                {profileLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#F0B90B]/30 border-t-[#F0B90B] rounded-full animate-spin" />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Profil yükleniyor...</span>
                  </div>
                ) : customerProfile && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(240,185,11,0.15)', border: '1px solid rgba(240,185,11,0.2)' }}>
                      <span className="text-[#F0B90B] font-black text-sm">
                        {String(customerProfile.profile?.full_name || customerProfile.profile?.email || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-xs leading-none truncate">{customerProfile.profile?.full_name || 'Kullanıcı'}</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">ID: {customerProfile.profile?.user_id} · VIP {customerProfile.profile?.user_level || 1}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-center">
                        <p className="text-[#F0B90B] font-black text-xs">${Number(usdtBal?.balance || 0).toFixed(0)}</p>
                        <p className="text-gray-600 text-[9px]">USDT</p>
                      </div>
                      <div className="text-center">
                        <p className="font-black text-xs" style={{ color: customerProfile.profile?.verification_status === 'verified' ? '#00DC82' : '#FF9800' }}>
                          {customerProfile.profile?.verification_status === 'verified' ? '✓' : '!'}
                        </p>
                        <p className="text-gray-600 text-[9px]">KYC</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {msgLoading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className={`skeleton rounded-2xl h-12 ${i % 2 === 0 ? 'mr-16' : 'ml-16'}`} />) :
                messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_type === 'admin' || m.sender_type === 'bot' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[82%] rounded-2xl px-4 py-3"
                      style={{
                        background: m.sender_type === 'admin' || m.sender_type === 'bot' ? 'rgba(240,185,11,0.12)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${m.sender_type === 'admin' || m.sender_type === 'bot' ? 'rgba(240,185,11,0.2)' : 'rgba(255,255,255,0.08)'}`,
                      }}>
                      <p className="text-sm text-white leading-relaxed">{m.message}</p>
                      <p className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {m.sender_type === 'admin' ? '👨‍💼 Admin' : m.sender_type === 'bot' ? '🤖 AI' : '👤 Kullanıcı'} · {timeAgo(m.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              <div ref={messagesEndRef} />
            </div>

            {selected.status !== 'closed' && (
              <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={doAIDraft}
                    disabled={aiDraftLoading || messages.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}
                  >
                    {aiDraftLoading ? <div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" /> : <Sparkles size={12} />}
                    AI Taslak
                  </button>
                  <button
                    onClick={() => setShowQuickReplies(p => !p)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                    style={{ background: 'rgba(240,185,11,0.1)', border: '1px solid rgba(240,185,11,0.2)', color: '#F0B90B' }}
                  >
                    ⚡ Hazır Yanıt
                    {showQuickReplies ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </button>
                </div>

                {showQuickReplies && (
                  <div className="flex flex-col gap-1 mb-2 max-h-36 overflow-y-auto">
                    {QUICK_REPLIES_TR.map((qr, i) => (
                      <button key={i} onClick={() => { setReply(qr.text); setShowQuickReplies(false); }}
                        className="text-left px-3 py-2 rounded-xl text-xs transition-all active:scale-[0.98]"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' }}>
                        <span className="font-bold text-[#F0B90B]">{qr.label}: </span>{qr.text.slice(0, 60)}…
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Yanıtınızı yazın…"
                    rows={2}
                    className="flex-1 rounded-2xl px-4 py-3 text-white text-sm outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doReply(); } }}
                  />
                  <button
                    onClick={doReply}
                    disabled={sending || !reply.trim()}
                    className="w-12 rounded-2xl flex items-center justify-center transition-opacity"
                    style={{ background: '#F0B90B', opacity: sending || !reply.trim() ? 0.4 : 1 }}
                  >
                    <Send size={16} color="black" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
