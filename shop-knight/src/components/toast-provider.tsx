"use client";

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Toast = { id: number; message: string; kind?: 'success' | 'error' | 'info' };

type ToastCtx = { push: (message: string, kind?: Toast['kind']) => void };

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-3 right-3 z-50 space-y-2">
        {toasts.map((t) => {
          const cls = t.kind === 'success' ? 'border-emerald-600 text-emerald-300' : t.kind === 'error' ? 'border-red-600 text-red-300' : 'border-zinc-600 text-zinc-200';
          return <div key={t.id} className={`rounded border bg-zinc-900/95 px-3 py-2 text-sm shadow ${cls}`}>{t.message}</div>;
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be used inside ToastProvider');
  return v;
}
