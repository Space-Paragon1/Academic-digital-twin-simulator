"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  UserCircle,
  FlaskConical,
  GitCompare,
  Sparkles,
  BrainCircuit,
  History,
  Settings,
  CalendarDays,
  Lock,
  GraduationCap,
  CalendarRange,
  Link2,
  Trophy,
  Timer,
  Calculator,
  FileText,
  Heart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navItems: { href: string; label: string; Icon: LucideIcon; description: string }[] = [
  { href: "/dashboard", label: "Dashboard",      Icon: LayoutDashboard, description: "Latest results"    },
  { href: "/profile",   label: "My Profile",     Icon: UserCircle,      description: "Courses & setup"   },
  { href: "/scenarios", label: "Scenarios",      Icon: FlaskConical,    description: "Run simulations"   },
  { href: "/schedule",  label: "Schedule",       Icon: CalendarDays,    description: "Weekly study plan"  },
  { href: "/planner",   label: "Planner",        Icon: CalendarRange,   description: "Multi-semester"    },
  { href: "/history",   label: "History",        Icon: History,         description: "All past runs"     },
  { href: "/grades",    label: "Grades",         Icon: GraduationCap,   description: "Actual grades"     },
  { href: "/compare",   label: "Compare",        Icon: GitCompare,      description: "Side-by-side"      },
  { href: "/optimizer", label: "Optimizer",      Icon: Sparkles,        description: "Best schedule"     },
  { href: "/advisor",   label: "Advisor",        Icon: BrainCircuit,    description: "AI + Goal targeting"},
  { href: "/canvas",      label: "Canvas Import",  Icon: Link2,        description: "Import from LMS"    },
  { href: "/leaderboard", label: "Leaderboard",    Icon: Trophy,       description: "Top students"       },
  { href: "/timer",       label: "Timer",          Icon: Timer,        description: "Pomodoro sessions"  },
  { href: "/gpa-calc",    label: "GPA Calc",       Icon: Calculator,   description: "Calculate GPA"      },
  { href: "/report",      label: "Report",         Icon: FileText,     description: "Print progress"     },
  { href: "/wellness",    label: "Wellness",       Icon: Heart,        description: "Mood & energy log"  },
  { href: "/settings",    label: "Settings",       Icon: Settings,     description: "Account & security" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 lg:flex flex-col bg-slate-900 border-r border-slate-800">

      {/* Nav items */}
      <nav className="flex flex-col gap-1 p-3 pt-4 flex-1">
        {navItems.map(({ href, label, Icon, description }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150",
                active
                  ? "bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              )}
            >
              <Icon
                size={17}
                className={clsx(
                  "shrink-0 transition-transform duration-150",
                  active ? "text-white" : "text-slate-500 group-hover:text-slate-300 group-hover:scale-110"
                )}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {label}
                </p>
                <p className={clsx(
                  "text-[11px] leading-tight truncate mt-0.5",
                  active ? "text-blue-100/70" : "text-slate-600 group-hover:text-slate-500"
                )}>
                  {description}
                </p>
              </div>

              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/70 shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Admin link — bottom separator */}
      <div className="px-3 pb-2">
        <Link
          href="/admin"
          className={clsx(
            "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150",
            pathname === "/admin"
              ? "bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-800 hover:text-slate-100"
          )}
        >
          <Lock
            size={17}
            className={clsx(
              "shrink-0 transition-transform duration-150",
              pathname === "/admin" ? "text-white" : "text-slate-600 group-hover:text-slate-300"
            )}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">Admin</p>
            <p className={clsx(
              "text-[11px] leading-tight truncate mt-0.5",
              pathname === "/admin" ? "text-blue-100/70" : "text-slate-600 group-hover:text-slate-500"
            )}>
              Student overview
            </p>
          </div>
        </Link>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-white" aria-hidden="true">
              <path d="M8 2L3 5v4l5 3 5-3V5L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 leading-tight">Academic Digital Twin</p>
            <p className="text-[10px] text-slate-600 leading-tight">v1.0 · MIT License</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
