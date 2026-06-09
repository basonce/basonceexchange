import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error';
  title: string;
  message?: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error', title: string, message?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

export default function ToastContainer({ toasts, removeToast }: { toasts: ToastMessage[]; removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 w-80 p-4 rounded-xl border bg-[#181A20] shadow-2xl shadow-black/50 pointer-events-auto animate-slide-up ${
            toast.type === 'success' ? 'border-[#0ECB81]/30' : 'border-[#F6465D]/30'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#0ECB81] shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#F6465D] shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-semibold ${toast.type === 'success' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {toast.title}
            </h4>
            {toast.message && <p className="text-[#848E9C] text-xs mt-1 leading-relaxed">{toast.message}</p>}
          </div>
          <button onClick={() => removeToast(toast.id)} className="text-[#5E6673] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
