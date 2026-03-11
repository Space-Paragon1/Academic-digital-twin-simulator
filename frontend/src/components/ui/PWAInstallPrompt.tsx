"use client";

import { useEffect, useState } from "react";

const PWA_DISMISSED_KEY = "adt_pwa_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(PWA_DISMISSED_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      setDeferredPrompt(null);
      setVisible(false);
    });
  }

  function handleDismiss() {
    localStorage.setItem(PWA_DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white shadow-2xl border border-slate-700 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0">📱</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">Install Academic Twin</p>
            <p className="text-xs text-slate-400 leading-tight mt-0.5 truncate">
              Install as an app for offline access
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-lg bg-brand-600 hover:bg-brand-500 transition-colors px-3 py-1.5 text-xs font-semibold text-white"
          >
            Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
