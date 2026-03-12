"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const SHORTCUTS = [
  { key: "?", description: "Show shortcuts" },
  { key: "D", description: "Go to Dashboard" },
  { key: "S", description: "Go to Scenarios" },
  { key: "H", description: "Go to History" },
  { key: "A", description: "Go to Advisor" },
  { key: "G", description: "Go to GPA Calculator" },
  { key: "T", description: "Go to Timer" },
  { key: "Esc", description: "Close modal" },
];

const NAV_MAP: Record<string, string> = {
  d: "/dashboard",
  s: "/scenarios",
  h: "/history",
  a: "/advisor",
  g: "/gpa-calc",
  t: "/timer",
};

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      // Don't fire when typing in inputs/textareas
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement).isContentEditable) return;

      const key = e.key.toLowerCase();

      if (e.key === "?" || e.key === "/") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      if (e.key === "Escape") {
        setOpen(false);
        return;
      }

      if (!e.metaKey && !e.ctrlKey && !e.altKey && NAV_MAP[key]) {
        e.preventDefault();
        setOpen(false);
        router.push(NAV_MAP[key]);
      }
    },
    [router]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close shortcuts"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-3">
          <table className="w-full text-sm">
            <tbody>
              {SHORTCUTS.map((s) => (
                <tr key={s.key} className="border-b border-slate-50 dark:border-slate-800 last:border-0">
                  <td className="py-2.5 pr-4">
                    <kbd className="inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 min-w-[2rem]">
                      {s.key}
                    </kbd>
                  </td>
                  <td className="py-2.5 text-slate-600 dark:text-slate-400">
                    {s.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            Press <kbd className="font-mono font-semibold">?</kbd> to toggle this panel
          </p>
        </div>
      </div>
    </div>
  );
}
