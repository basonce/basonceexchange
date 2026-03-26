import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertCategory = 'user' | 'finance' | 'security' | 'support' | 'system' | 'visitor';

export interface AlertEvent {
  id: string;
  ts: number;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  body: string;
  meta?: Record<string, string | number | boolean>;
  read: boolean;
  dismissed: boolean;
}

export interface AppSettings {
  muteFrom: string;
  muteTo: string;
  muteAll: boolean;
  depositThreshold: number;
  largeTradeThreshold: number;
  alertSounds: boolean;
  browserNotifications: boolean;
  pin: string;
}

interface StoreState {
  alerts: AlertEvent[];
  settings: AppSettings;
  activeVisitors: number;
  totalUsers: number;
  todayDeposits: number;
  todayWithdrawals: number;
  pendingSupport: number;
  addAlert: (a: Omit<AlertEvent, 'id' | 'ts' | 'read' | 'dismissed'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  setStats: (s: Partial<Pick<StoreState, 'activeVisitors' | 'totalUsers' | 'todayDeposits' | 'todayWithdrawals' | 'pendingSupport'>>) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      alerts: [],
      settings: {
        muteFrom: '00:00',
        muteTo: '07:00',
        muteAll: false,
        depositThreshold: 100,
        largeTradeThreshold: 1000,
        alertSounds: true,
        browserNotifications: true,
        pin: '1332',
      },
      activeVisitors: 0,
      totalUsers: 0,
      todayDeposits: 0,
      todayWithdrawals: 0,
      pendingSupport: 0,
      addAlert: (a) => set((s) => ({
        alerts: [
          { ...a, id: crypto.randomUUID(), ts: Date.now(), read: false, dismissed: false },
          ...s.alerts.slice(0, 499),
        ],
      })),
      markRead: (id) => set((s) => ({
        alerts: s.alerts.map(a => a.id === id ? { ...a, read: true } : a),
      })),
      markAllRead: () => set((s) => ({
        alerts: s.alerts.map(a => ({ ...a, read: true })),
      })),
      dismiss: (id) => set((s) => ({
        alerts: s.alerts.map(a => a.id === id ? { ...a, dismissed: true } : a),
      })),
      clearAll: () => set({ alerts: [] }),
      updateSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
      setStats: (s) => set(s),
    }),
    { name: 'admin-monitor-store', partialize: (s) => ({ alerts: s.alerts, settings: s.settings }) }
  )
);

export function isMuted(settings: AppSettings): boolean {
  if (settings.muteAll) return true;
  const now = new Date();
  const [fh, fm] = settings.muteFrom.split(':').map(Number);
  const [th, tm] = settings.muteTo.split(':').map(Number);
  const current = now.getHours() * 60 + now.getMinutes();
  const from = fh * 60 + fm;
  const to = th * 60 + tm;
  if (from <= to) return current >= from && current < to;
  return current >= from || current < to;
}
