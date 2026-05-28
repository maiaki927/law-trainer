"use client";

import * as React from "react";

interface ToastItem {
  id: number;
  message: string;
}

interface ToastCtx {
  push: (msg: string) => void;
}

const Ctx = React.createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const counter = React.useRef(0);

  const push = React.useCallback((message: string) => {
    counter.current += 1;
    const id = counter.current;
    setItems((s) => [...s, { id, message }]);
    setTimeout(() => {
      setItems((s) => s.filter((i) => i.id !== id));
    }, 3000);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
        {items.map((i) => (
          <div
            key={i.id}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg"
          >
            {i.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) {
    return { push: () => {} } as ToastCtx;
  }
  return ctx;
}
