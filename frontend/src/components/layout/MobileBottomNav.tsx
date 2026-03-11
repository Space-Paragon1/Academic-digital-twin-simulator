"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { LayoutDashboard, FlaskConical, CalendarDays, BrainCircuit, GraduationCap } from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/scenarios", label: "Scenarios",  Icon: FlaskConical    },
  { href: "/schedule",  label: "Schedule",   Icon: CalendarDays    },
  { href: "/advisor",   label: "Advisor",    Icon: BrainCircuit    },
  { href: "/grades",    label: "Grades",     Icon: GraduationCap   },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      <div className="flex items-center justify-around h-16 px-2">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-0",
                active
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-slate-400 dark:text-slate-500"
              )}
            >
              <Icon size={20} className={clsx(active && "scale-110 transition-transform")} />
              <span className={clsx(
                "text-[10px] font-medium leading-tight truncate",
                active ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500"
              )}>
                {label}
              </span>
              {active && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-gradient-to-r from-brand-600 to-indigo-500 -translate-y-px" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
