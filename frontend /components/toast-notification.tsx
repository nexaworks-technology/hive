'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, AlertCircle, Info } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'loading' | 'warning' | 'error';
  duration?: number;
}

export const toastManager = {
  toasts: [] as Toast[],
  listeners: [] as ((toasts: Toast[]) => void)[],

  subscribe(listener: (toasts: Toast[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  },

  notify(toast: Omit<Toast, 'id'>) {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { ...toast, id };
    this.toasts.push(newToast);
    this.listeners.forEach((listener) => listener([...this.toasts]));

    if (toast.duration !== 0) {
      setTimeout(() => {
        this.toasts = this.toasts.filter((t) => t.id !== id);
        this.listeners.forEach((listener) => listener([...this.toasts]));
      }, toast.duration || 4000);
    }

    return id;
  },

  remove(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.listeners.forEach((listener) => listener([...this.toasts]));
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts);
    return unsubscribe;
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg border p-4 shadow-lg animate-in slide-in-from-bottom-4 ${
            toast.type === 'success'
              ? 'bg-primary/10 border-primary/30 text-foreground'
              : toast.type === 'info'
                ? 'bg-accent/10 border-accent/30 text-foreground'
                : toast.type === 'loading'
                  ? 'bg-secondary border-border text-foreground'
                  : toast.type === 'warning'
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-foreground'
                    : 'bg-destructive/10 border-destructive/30 text-foreground'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-primary" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-accent" />}
              {toast.type === 'loading' && <Clock className="w-5 h-5 animate-spin" />}
              {(toast.type === 'warning' || toast.type === 'error') && <AlertCircle className="w-5 h-5 text-destructive" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{toast.title}</p>
              {toast.message && <p className="text-xs text-muted-foreground mt-1">{toast.message}</p>}
            </div>
            <button
              onClick={() => toastManager.remove(toast.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
