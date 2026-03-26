import { useEffect, useState } from 'react';
import { RefreshCw, Send, X, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { fetchSupportTickets, fetchSupportMessages, sendSupportReply, closeSupportTicket, markMessagesRead, fetchUnreadSupportCount } from '../lib/admin-api';

interface Ticket { id: string; subject?: string; status: string; created_at: string; user_profiles?: { email: string; full_name: string }; }
interface Message { id: string; message: string; sender_type: string; created_at: string; read: boolean; }

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

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [t, u] = await Promise.all([fetchSupportTickets(), fetchUnreadSupportCount()]);
    setTickets(t);
    setUnread(u);
    setLoading(false);
  }

  async function openTicket(t: Ticket) {
    setSelected(t);
    setMsgLoading(true);
    const msgs = await fetchSupportMessages(t.id);
    setMessages(msgs);
    setMsgLoading(false);
    await markMessagesRead(t.id);
    setUnread(u => Math.max(0, u - msgs.filter((m: Message) => !m.read && m.sender_type === 'customer').length));
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

  async function doClose() {
    if (!selected) return;
    await closeSupportTicket(selected.id);
    setTickets(ts => ts.map(t => t.id === selected.id ? { ...t, status: 'closed' } : t));
    setSelected(null);
    showToast('🔒 Ticket kapatıldı');
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  const filtered = tickets.filter(t => filter === 'all' || t.status === filter);

  const statusColor: Record<string, string> = {
    open: '#F0B90B', answered: '#3D7FFF', closed: '#555', pending: '#FF9800',
  };
  const statusLabel: Record<string, string> = {
    open: 'Açık', answered: 'Yanıtlandı', closed: 'Kapalı', pending: 'Bekliyor',
  };

  function timeAgo(dt: string) {
    const d = Date.now() - new Date(dt).getTime();
    if (d < 3600000) return `${Math.floor(d/60000)} dk`;
    if (d < 86400000) return `${Math.floor(d/3600000)} sa`;
    return `${Math.floor(d/86400000)} gün`;
  }

  return (
    <div className="flex flex-col pb-28">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-medium text-white slide-down"
          style={{ background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
          {toast}
        </div>
      )}

      <div className="p-4 pt-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: '#F0B90B', letterSpacing: '0.08em' }}>DESTEK YÖNETİMİ</p>
            <h1 className="text-2xl font-black text-white">Destek</h1>
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: '#FF4757', color: 'white' }}>{unread}</span>
            )}
            <button onClick={load} className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} color="rgba(255,255,255,0.6)" />
            </button>
          </div>
        </div>

        {/* Stats */}
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

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {(['all', 'open', 'answered', 'closed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="flex-none px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: filter === f ? 'rgba(240,185,11,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${filter === f ? 'rgba(240,185,11,0.3)' : 'rgba(255,255,255,0.07)'}`, color: filter === f ? '#F0B90B' : 'rgba(255,255,255,0.4)' }}>
              {f === 'all' ? 'Tümü' : statusLabel[f]}
            </button>
          ))}
        </div>

        {/* Ticket list */}
        {loading ? Array.from({length:5}).map((_,i)=><div key={i} className="skeleton rounded-2xl h-20" />) :
         filtered.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(0,220,130,0.04)', border: '1px solid rgba(0,220,130,0.1)' }}>
            <p className="text-2xl mb-2">📭</p>
            <p className="text-sm" style={{ color: '#00DC82' }}>Ticket bulunamadı</p>
          </div>
        ) : filtered.map(t => (
          <button key={t.id} onClick={() => openTicket(t)}
            className="rounded-2xl p-4 flex items-start gap-3 text-left active:scale-[0.98] transition-transform w-full"
            style={{ background: t.status === 'open' ? 'rgba(240,185,11,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${t.status === 'open' ? 'rgba(240,185,11,0.18)' : 'rgba(255,255,255,0.07)'}` }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-none" style={{ background: t.status === 'open' ? 'rgba(240,185,11,0.15)' : 'rgba(255,255,255,0.08)' }}>
              <MessageSquare size={16} color={statusColor[t.status] || '#888'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className="text-sm font-semibold text-white truncate">{t.subject || 'Destek Talebi'}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-none" style={{ background: `${statusColor[t.status] || '#888'}22`, color: statusColor[t.status] || '#888' }}>
                  {statusLabel[t.status] || t.status}
                </span>
              </div>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{t.user_profiles?.email || 'Bilinmeyen kullanıcı'}</p>
              <div className="flex items-center gap-1 mt-1">
                <Clock size={10} color="rgba(255,255,255,0.2)" />
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{timeAgo(t.created_at)} önce</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Ticket conversation */}
      {selected && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="absolute inset-x-0 bottom-0 top-20 max-w-[430px] mx-auto rounded-t-3xl flex flex-col slide-up"
            style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Header */}
            <div className="flex items-center gap-3 p-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(240,185,11,0.15)' }}>
                <MessageSquare size={16} color="#F0B90B" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{selected.subject || 'Destek Talebi'}</p>
                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{selected.user_profiles?.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {selected.status !== 'closed' && (
                  <button onClick={doClose} className="px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>
                    Kapat
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <X size={15} color="rgba(255,255,255,0.6)" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {msgLoading ? Array.from({length:3}).map((_,i)=><div key={i} className={`skeleton rounded-2xl h-12 ${i%2===0?'mr-16':'ml-16'}`} />) :
               messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%] rounded-2xl px-4 py-3"
                    style={{
                      background: m.sender_type === 'admin' ? 'rgba(240,185,11,0.15)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${m.sender_type === 'admin' ? 'rgba(240,185,11,0.25)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                    <p className="text-sm text-white leading-relaxed">{m.message}</p>
                    <p className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {m.sender_type === 'admin' ? '👨‍💼 Admin' : '👤 Kullanıcı'} · {timeAgo(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply input */}
            {selected.status !== 'closed' && (
              <div className="p-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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
