"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile",   label: "Profile"   },
  { href: "/scenarios", label: "Scenarios" },
  { href: "/compare",   label: "Compare"   },
  { href: "/optimizer", label: "Optimizer" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm">
      <div className="flex h-14 items-center justify-between px-5 lg:px-8">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-indigo-600 shadow-md">
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-white" aria-hidden="true">
              <path d="M8 2L3 5v4l5 3 5-3V5L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M8 9v5M3 9l5 5 5-5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeOpacity="0.7"/>
            </svg>
          </div>
          <span className="font-bold tracking-tight text-slate-800 text-[15px] group-hover:text-brand-700 transition-colors">
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
                    ? "text-brand-700 bg-brand-50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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

        {/* Mobile hamburger */}
        <button
          type="button"
          className="lg:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          <span className={clsx("block h-0.5 w-5 bg-slate-600 transition-transform origin-center", mobileOpen && "translate-y-2 rotate-45")} />
          <span className={clsx("block h-0.5 w-5 bg-slate-600 transition-opacity",                  mobileOpen && "opacity-0")} />
          <span className={clsx("block h-0.5 w-5 bg-slate-600 transition-transform origin-center", mobileOpen && "-translate-y-2 -rotate-45")} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <nav className="lg:hidden border-t border-slate-100 bg-white/95 backdrop-blur px-4 pb-4 pt-2 flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === href || pathname.startsWith(href + "/")
                  ? "bg-brand-50 text-brand-700 border border-brand-100"
                  : "text-slate-700 hover:bg-slate-100"
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
