"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Moon, Sun, LogIn, LogOut } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile",   label: "Profile"   },
  { href: "/scenarios", label: "Scenarios" },
  { href: "/compare",   label: "Compare"   },
  { href: "/optimizer", label: "Optimizer" },
  { href: "/advisor",   label: "Advisor"   },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm">
      <div className="flex h-14 items-center justify-between px-5 lg:px-8">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-indigo-600 shadow-md">
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-white" aria-hidden="true">
              <path d="M8 2L3 5v4l5 3 5-3V5L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M8 9v5M3 9l5 5 5-5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeOpacity="0.7"/>
            </svg>
          </div>
          <span className="font-bold tracking-tight text-slate-800 dark:text-slate-100 text-[15px] group-hover:text-brand-700 transition-colors">
            Academic<span className="text-brand-600">Twin</span>
          </span>
          <span className="hidden sm:inline-flex items-center rounded-full bg-brand-50 border border-brand-200 px-2 py-0.5 text-[10px] font-semibold text-brand-600 uppercase tracking-wide">
            Beta
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5 text-sm font-medium">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "relative rounded-lg px-3.5 py-1.5 transition-all duration-150",
                  active
                    ? "text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-600 to-indigo-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side controls */}
        <div className="hidden sm:flex items-center gap-1">
          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Auth button */}
          {user ? (
            <div className="flex items-center gap-2 ml-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[120px] truncate hidden md:block">
                {user.name}
              </span>
              <button
                type="button"
                onClick={logout}
                aria-label="Sign out"
                title="Sign out"
                className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-lg px-3 h-8 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
            >
              <LogIn size={14} />
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="lg:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          <span className={clsx("block h-0.5 w-5 bg-slate-600 dark:bg-slate-400 transition-transform origin-center", mobileOpen && "translate-y-2 rotate-45")} />
          <span className={clsx("block h-0.5 w-5 bg-slate-600 dark:bg-slate-400 transition-opacity",                  mobileOpen && "opacity-0")} />
          <span className={clsx("block h-0.5 w-5 bg-slate-600 dark:bg-slate-400 transition-transform origin-center", mobileOpen && "-translate-y-2 -rotate-45")} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <nav className="lg:hidden border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 pb-4 pt-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === href || pathname.startsWith(href + "/")
                  ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 border border-brand-100 dark:border-brand-800"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
