import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: TriangleAlert,
  info: Info,
};

const STYLES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-slate-200 bg-white text-slate-900',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((payload) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toast = {
      id,
      type: payload.type || 'info',
      title: payload.title || '',
      description: payload.description || '',
      duration: payload.duration ?? 3500,
    };

    setToasts((current) => [...current, toast]);

    if (toast.duration > 0) {
      window.setTimeout(() => {
        dismiss(id);
      }, toast.duration);
    }
  }, [dismiss]);

  const api = useMemo(() => ({
    push,
    success: (description, title = 'Sucesso') => push({ type: 'success', title, description }),
    error: (description, title = 'Erro') => push({ type: 'error', title, description }),
    info: (description, title = 'Informação') => push({ type: 'info', title, description }),
    dismiss,
  }), [dismiss, push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[1300] flex w-[min(92vw,26rem)] flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || ICONS.info;
          const toneClass = STYLES[toast.type] || STYLES.info;

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${toneClass}`}
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  {toast.title ? <p className="text-sm font-semibold">{toast.title}</p> : null}
                  {toast.description ? <p className="text-sm leading-5 opacity-90">{toast.description}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
                  aria-label="Fechar notificação"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
