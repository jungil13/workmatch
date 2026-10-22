'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = toast.duration ?? 4500;
    setToasts((prev) => [...prev, { ...toast, id, duration }]);
    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration);
    }
    return id;
  }, [dismissToast]);

  const success = useCallback((title: string, message?: string) => showToast({ type: 'success', title, message }), [showToast]);
  const error = useCallback((title: string, message?: string) => showToast({ type: 'error', title, message, duration: 6000 }), [showToast]);
  const warning = useCallback((title: string, message?: string) => showToast({ type: 'warning', title, message }), [showToast]);
  const info = useCallback((title: string, message?: string) => showToast({ type: 'info', title, message }), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
  error: <XCircle className="w-4 h-4 text-rose-600 shrink-0" />,
  warning: <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />,
  info: <Info className="w-4 h-4 text-sky-600 shrink-0" />,
};

const toastStyles: Record<ToastType, string> = {
  success: 'bg-white border-emerald-200',
  error: 'bg-white border-rose-200',
  warning: 'bg-white border-amber-200',
  info: 'bg-white border-sky-200',
};

const barStyles: Record<ToastType, string> = {
  success: 'bg-emerald-500',
  error: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
};

function ToastEntry({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const duration = toast.duration ?? 4500;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'relative flex items-start gap-3 w-full rounded-2xl border p-4 shadow-lg transition-all duration-300',
        toastStyles[toast.type],
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      )}
    >
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl overflow-hidden">
          <div
            className={cn('h-full origin-left', barStyles[toast.type])}
            style={{ animation: `toast-shrink ${duration}ms linear forwards` }}
          />
        </div>
      )}
      <div className="mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-900 leading-tight">{toast.title}</p>
        {toast.message && (
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-label="Toast notifications"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full max-w-sm">
          <ToastEntry toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// useConfirm - replaces native window.confirm() with a styled prompt card
// ---------------------------------------------------------------------------

interface ConfirmState {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  type: 'error' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export function useConfirm() {
  const [pending, setPending] = useState<ConfirmState | null>(null);

  const confirm = useCallback(
    (
      message: string,
      opts?: { confirmLabel?: string; cancelLabel?: string; type?: 'error' | 'warning' }
    ): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        setPending({
          message,
          confirmLabel: opts?.confirmLabel ?? 'Confirm',
          cancelLabel: opts?.cancelLabel ?? 'Cancel',
          type: opts?.type ?? 'warning',
          onConfirm: () => { setPending(null); resolve(true); },
          onCancel: () => { setPending(null); resolve(false); },
        });
      }),
    []
  );

  const ConfirmDialog = pending ? (
    <div className="fixed bottom-5 right-5 z-[9999] w-full max-w-sm pointer-events-auto">
      <div
        className={cn(
          'flex flex-col gap-3 rounded-2xl border p-4 shadow-xl bg-white',
          pending.type === 'error' ? 'border-rose-200' : 'border-amber-200'
        )}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{icons[pending.type]}</div>
          <p className="text-xs font-semibold text-slate-800 leading-snug flex-1">{pending.message}</p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={pending.onCancel}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {pending.cancelLabel}
          </button>
          <button
            type="button"
            onClick={pending.onConfirm}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-colors',
              pending.type === 'error' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'
            )}
          >
            {pending.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmDialog };
}
