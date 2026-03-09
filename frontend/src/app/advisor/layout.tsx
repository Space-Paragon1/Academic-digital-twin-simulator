"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/advisor",       label: "AI Chat"        },
  { href: "/advisor/goal",  label: "Goal Targeting" },
  { href: "/advisor/multi", label: "All Students"   },
];

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Academic Advisor</h1>
        <p className="text-sm text-gray-500 mt-1">
          AI-powered guidance, schedule optimization, and multi-student monitoring
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              pathname === t.href
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
