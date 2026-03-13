"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  History,
  BrainCircuit,
  CalendarDays,
  Trophy,
  Timer,
  Calculator,
  Settings,
  User,
  BarChart2,
  Zap,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Command {
  label: string;
  href: string;
  Icon: LucideIcon;
}

const COMMANDS: Command[] = [
  { label: "Go to Dashboard",   href: "/dashboard",   Icon: LayoutDashboard },
  { label: "Go to Scenarios",   href: "/scenarios",   Icon: FlaskConical    },
  { label: "Go to History",     href: "/history",     Icon: History         },
  { label: "Go to Advisor",     href: "/advisor",     Icon: BrainCircuit    },
  { label: "Go to Schedule",    href: "/schedule",    Icon: CalendarDays    },
  { label: "Go to Leaderboard", href: "/leaderboard", Icon: Trophy          },
  { label: "Go to Timer",       href: "/timer",       Icon: Timer           },
  { label: "Go to GPA Calc",    href: "/gpa-calc",    Icon: Calculator      },
  { label: "Go to Settings",    href: "/settings",    Icon: Settings        },
  { label: "Go to Profile",     href: "/profile",     Icon: User            },
  { label: "Go to Compare",     href: "/compare",     Icon: BarChart2       },
  { label: "Go to Optimizer",   href: "/optimizer",   Icon: Zap             },
  { label: "Go to Admin",       href: "/admin",       Icon: ShieldCheck     },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) navigate(filtered[activeIndex].href);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 px-4"
      onClick={close}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <svg
            className="h-4 w-4 text-slate-400 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages…"
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <span className="shrink-0 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            ⌘K
          </span>
        </div>

        {/* Results */}
        <ul className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              No results for &ldquo;{query}&rdquo;
            </li>
          ) : (
            filtered.map((cmd, idx) => {
              const active = idx === activeIndex;
              return (
                <li key={cmd.href}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => navigate(cmd.href)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      active
                        ? "bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <cmd.Icon
                      size={15}
                      className={active ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500"}
                    />
                    {cmd.label}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
          <span><kbd className="font-sans">↑↓</kbd> to navigate</span>
          <span><kbd className="font-sans">↵</kbd> to select</span>
          <span><kbd className="font-sans">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
