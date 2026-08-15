import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';

const ToastContext = createContext(undefined);

const TOAST_ACCENTS = {
  BOOKING: 'border-indigo-200 bg-indigo-50/95',
  LEAD: 'border-amber-200 bg-amber-50/95',
  PAYMENT: 'border-emerald-200 bg-emerald-50/95',
  PLATFORM_FEE: 'border-emerald-200 bg-emerald-50/95',
  PROMOTION: 'border-purple-200 bg-purple-50/95',
  ACCOUNT: 'border-rose-200 bg-rose-50/95',
};

let toastSeq = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(({ title, message, type = 'SYSTEM' }) => {
    const id = ++toastSeq;
    setToasts(prev => [...prev.slice(-2), { id, title, message, type }]);
    timersRef.current.set(id, setTimeout(() => dismiss(id), 6000));
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label={`Dismiss notification: ${t.title}`}
            className={`toast-in pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 text-left shadow-lg cursor-pointer ${TOAST_ACCENTS[t.type] || 'border-teal-200 bg-teal-50/95'}`}
          >
            <Bell className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-extrabold text-slate-900 leading-snug">{t.title}</span>
              {t.message && (
                <span className="block text-[11px] text-slate-600 font-medium mt-0.5 leading-snug line-clamp-2">{t.message}</span>
              )}
            </span>
            <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside a ToastProvider');
  return ctx;
};
