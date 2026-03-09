"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

const SESSION_KEY = "adt_admin_unlocked";
const CORRECT_PIN = "1234";

interface PinGateProps {
  children: React.ReactNode;
}

export function PinGate({ children }: PinGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin]           = useState("");
  const [error, setError]       = useState(false);
  const [checked, setChecked]   = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setUnlocked(true);
    }
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (unlocked) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === CORRECT_PIN) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[340px] gap-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
          <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-slate-500 dark:text-slate-400" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.7"/>
            <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Admin Access Required</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
          The All Students view is restricted. Enter the 4-digit PIN to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3 w-full max-w-xs">
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(false); }}
          placeholder="• • • •"
          className={`w-full text-center text-2xl tracking-[0.6em] rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-colors ${
            error
              ? "border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-600"
              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          }`}
          autoFocus
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">Incorrect PIN. Try again.</p>
        )}
        <Button type="submit" className="w-full" disabled={pin.length < 4}>
          Unlock
        </Button>
      </form>
    </div>
  );
}
