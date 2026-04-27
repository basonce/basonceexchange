// P2P API client — cf-worker /api/p2p/* uçlarını çağırır
import { supabase } from './supabase';

const API_BASE = (() => {
  // Replit dev preview'da production'a vur
  if (typeof window !== 'undefined' && /replit\.dev|localhost/.test(window.location.host)) {
    return 'https://basonce.com/api';
  }
  return '/api';
})();

async function authHeaders(): Promise<Record<string, string>> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
    if (session?.user?.id) h['x-requester-id'] = session.user.id;
  } catch {}
  return h;
}

async function call<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = { ...(await authHeaders()), ...(opts.headers || {}) };
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const txt = await res.text();
  let data: any = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = { error: txt }; }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data as T;
}

export interface P2PMerchant {
  username: string; trades: number; completed: number;
  completion: string; like: number; dislike: number;
  verified: boolean; merchant_badge: string | null;
}
export interface P2PAd {
  id: string; advertiser_id: string;
  ad_type: 'buy' | 'sell';
  crypto_symbol: string; crypto_network: string;
  fiat_currency: string;
  price: number; min_amount: number; max_amount: number;
  total_crypto: number; available_crypto: number;
  payment_methods: string[]; payment_window_minutes: number;
  terms: string | null; status: string;
  trade_count: number; created_at: string;
  merchant?: P2PMerchant;
}
export interface P2POrder {
  id: string; order_number: string;
  ad_id: string; buyer_id: string; seller_id: string;
  crypto_symbol: string; crypto_network: string; fiat_currency: string;
  crypto_amount: number; fiat_amount: number; price: number;
  payment_method: string;
  payment_method_details: any;
  status: 'pending_payment'|'paid'|'completed'|'cancelled'|'disputed'|'expired';
  payment_deadline: string;
  buyer_marked_paid_at: string | null; seller_confirmed_at: string | null;
  completed_at: string | null; cancelled_at: string | null;
  dispute_opened_at: string | null; dispute_reason: string | null;
  created_at: string;
}
export interface P2PMessage {
  id: string; order_id: string; sender_id: string;
  message: string; is_system: boolean; created_at: string;
}
export interface P2PPaymentMethod {
  id: string; user_id: string;
  method_type: string; account_name: string;
  account_number: string | null; bank_name: string | null;
  notes: string | null; is_active: boolean;
}

export const p2pApi = {
  // İlanlar
  listAds: (params: { type: 'buy'|'sell'; symbol: string; currency: string; payment_method?: string; amount?: number; }) => {
    const q = new URLSearchParams();
    q.set('type', params.type);
    q.set('symbol', params.symbol);
    q.set('currency', params.currency);
    if (params.payment_method) q.set('payment_method', params.payment_method);
    if (params.amount) q.set('amount', String(params.amount));
    return call<{ ads: P2PAd[] }>(`/p2p/ads?${q.toString()}`);
  },
  myAds: () => call<{ ads: P2PAd[] }>(`/p2p/my-ads`),
  createAd: (b: Partial<P2PAd> & { ad_type: 'buy'|'sell' }) =>
    call<{ ad: P2PAd }>(`/p2p/ads`, { method: 'POST', body: JSON.stringify(b) }),
  updateAd: (id: string, b: Partial<P2PAd>) =>
    call<{ ad: P2PAd }>(`/p2p/ads/${id}`, { method: 'PATCH', body: JSON.stringify(b) }),
  deleteAd: (id: string) =>
    call<{ ok: boolean }>(`/p2p/ads/${id}`, { method: 'DELETE' }),

  // Siparişler
  createOrder: (b: { ad_id: string; fiat_amount: number; payment_method: string; }) =>
    call<{ order: P2POrder }>(`/p2p/orders`, { method: 'POST', body: JSON.stringify(b) }),
  myOrders: (status?: string) =>
    call<{ orders: P2POrder[]; my_id: string }>(`/p2p/orders${status ? `?status=${status}` : ''}`),
  getOrder: (id: string) =>
    call<{ order: P2POrder; messages: P2PMessage[]; my_id: string }>(`/p2p/orders/${id}`),
  markPaid: (id: string) =>
    call<{ ok: boolean }>(`/p2p/orders/${id}/mark-paid`, { method: 'POST' }),
  confirm: (id: string) =>
    call<{ ok: boolean }>(`/p2p/orders/${id}/confirm`, { method: 'POST' }),
  cancel: (id: string, reason?: string) =>
    call<{ ok: boolean }>(`/p2p/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  dispute: (id: string, reason: string) =>
    call<{ ok: boolean }>(`/p2p/orders/${id}/dispute`, { method: 'POST', body: JSON.stringify({ reason }) }),
  sendMessage: (id: string, message: string) =>
    call<{ message: P2PMessage }>(`/p2p/orders/${id}/messages`, { method: 'POST', body: JSON.stringify({ message }) }),
  fetchMessages: (id: string) =>
    call<{ messages: P2PMessage[] }>(`/p2p/orders/${id}/messages`),

  // Ödeme yöntemleri
  listPaymentMethods: () =>
    call<{ payment_methods: P2PPaymentMethod[] }>(`/p2p/payment-methods`),
  addPaymentMethod: (b: Partial<P2PPaymentMethod>) =>
    call<{ payment_method: P2PPaymentMethod }>(`/p2p/payment-methods`, { method: 'POST', body: JSON.stringify(b) }),
  deletePaymentMethod: (id: string) =>
    call<{ ok: boolean }>(`/p2p/payment-methods/${id}`, { method: 'DELETE' }),

  // Admin
  adminListDisputes: () =>
    call<{ orders: P2POrder[] }>(`/p2p/admin/disputes`),
  adminResolveDispute: (b: { order_id: string; winner: 'buyer'|'seller'; note?: string }) =>
    call<{ ok: boolean }>(`/p2p/admin/resolve-dispute`, { method: 'POST', body: JSON.stringify(b) }),
};
