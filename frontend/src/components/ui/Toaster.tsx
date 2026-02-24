"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

// ── Context ────────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return {
    success: (message: string, title?: string) => ctx.addToast({ type: "success", message, title }),
    error: (message: string, title?: string) => ctx.addToast({ type: "error", message, title }),
    warning: (message: string, title?: string) => ctx.addToast({ type: "warning", message, title }),
    info: (message: string, title?: string) => ctx.addToast({ type: "info", message, title }),
  };
}

// ── Visual constants ───────────────────────────────────────────────────────────

const DURATION = 4500;

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const STYLE: Record<ToastType, { icon: string; bar: string; ring: string }> = {
  success: { icon: "bg-green-100 text-green-700", bar: "bg-green-500",  ring: "ring-green-100"  },
  error:   { icon: "bg-red-100 text-red-700",     bar: "bg-red-500",    ring: "ring-red-100"    },
  warning: { icon: "bg-amber-100 text-amber-700", bar: "bg-amber-400",  ring: "ring-amber-100"  },
  info:    { icon: "bg-blue-100 text-blue-700",   bar: "bg-blue-500",   ring: "ring-blue-100"   },
};

// ── SingleToast visual component ───────────────────────────────────────────────

function SingleToast({ toast, onRemove }: { toast: ToastItem; onRemove: () => void }) {
  const { type, title, message } = toast;
  const s = STYLE[type];
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    // Trigger shrink on next frame so the initial 100% width paints first
    const raf = requestAnimationFrame(() => {
      el.style.transition = `width ${DURATION}ms linear`;
      el.style.width = "0%";
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-white shadow-lg ring-1 ${s.ring} w-80 max-w-[calc(100vw-2rem)]`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${s.icon}`}
          aria-hidden="true"
        >
          {ICONS[type]}
        </span>
        <div className="flex-1 min-w-0">
          {title && (
            <p className="text-sm font-semibold text-gray-900 leading-snug">{title}</p>
          )}
          <p className="text-sm text-gray-600 leading-snug">{message}</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors leading-none text-base mt-0.5"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
      {/* Shrinking progress bar */}
      <div ref={barRef} className={`h-0.5 ${s.bar}`} style={{ width: "100%" }} />
    </div>
  );
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => removeToast(id), DURATION);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Fixed overlay — bottom-right, newest on top */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-3 pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <SingleToast toast={t} onRemove={() => removeToast(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
