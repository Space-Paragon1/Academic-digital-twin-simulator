"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { LayoutDashboard, UserCircle, FlaskConical, GitCompare, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navItems: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/profile", label: "My Profile", Icon: UserCircle },
  { href: "/scenarios", label: "Scenarios", Icon: FlaskConical },
  { href: "/compare", label: "Compare", Icon: GitCompare },
  { href: "/optimizer", label: "Optimizer", Icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-gray-50 lg:block">
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
