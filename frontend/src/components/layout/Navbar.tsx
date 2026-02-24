"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/scenarios", label: "Scenarios" },
  { href: "/compare", label: "Compare" },
  { href: "/optimizer", label: "Optimizer" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-brand-600 text-lg font-bold">AcademicTwin</span>
          <span className="rounded bg-brand-100 px-1.5 py-0.5 text-xs font-medium text-brand-700">
            Beta
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "rounded-md px-3 py-1.5 transition-colors",
                pathname === href || pathname.startsWith(href + "/")
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="lg:hidden flex flex-col gap-1.5 p-2 rounded-md hover:bg-gray-100 transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen ? "true" : "false"}
        >
          <span className={clsx("block h-0.5 w-5 bg-gray-600 transition-transform", mobileOpen && "translate-y-2 rotate-45")} />
          <span className={clsx("block h-0.5 w-5 bg-gray-600 transition-opacity", mobileOpen && "opacity-0")} />
          <span className={clsx("block h-0.5 w-5 bg-gray-600 transition-transform", mobileOpen && "-translate-y-2 -rotate-45")} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <nav className="lg:hidden border-t border-gray-100 bg-white px-4 pb-3 pt-2 flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === href || pathname.startsWith(href + "/")
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-700 hover:bg-gray-100"
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
