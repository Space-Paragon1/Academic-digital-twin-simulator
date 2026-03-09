"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/advisor",       label: "AI Chat"        },
  { href: "/advisor/goal",  label: "Goal Targeting" },
  { href: "/advisor/multi", label: "All Students"   },
];

export function AdvisorTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            pathname === t.href
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
