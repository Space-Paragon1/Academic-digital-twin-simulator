"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import type { SimulationResult } from "@/lib/types";

const NOTIF_KEY_PREFIX = "adt_notifications_";
const GOAL_KEY_PREFIX = "adt_gpa_goal_";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface AppNotification {
  id: string;
  type: "burnout" | "streak" | "goal";
  message: string;
  timestamp: string; // ISO string
  read: boolean;
}

interface NotificationBellProps {
  studentId: number;
  simulations: SimulationResult[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function generateNotifications(
  simulations: SimulationResult[],
  studentId: number,
): AppNotification[] {
  const notifs: AppNotification[] = [];
  if (simulations.length === 0) return notifs;

  const latest = simulations[simulations.length - 1];

  // Burnout alert
  if (latest.summary.burnout_risk === "HIGH") {
    notifs.push({
      id: `burnout-${latest.id ?? 0}`,
      type: "burnout",
      message: `High burnout risk detected in your latest simulation (${(latest.summary.burnout_probability * 100).toFixed(0)}%). Review your schedule.`,
      timestamp: latest.created_at ?? new Date().toISOString(),
      read: false,
    });
  }

  // Streak broken — no sim in last 7 days
  const withDate = simulations.filter((s) => s.created_at);
  if (withDate.length > 0) {
    const lastSim = withDate[withDate.length - 1];
    const daysSince = Date.now() - new Date(lastSim.created_at!).getTime();
    if (daysSince >= SEVEN_DAYS_MS) {
      const days = Math.floor(daysSince / 86_400_000);
      notifs.push({
        id: `streak-${days}`,
        type: "streak",
        message: `You haven't run a simulation in ${days} days. Keep your predictions up to date!`,
        timestamp: new Date(Date.now() - SEVEN_DAYS_MS).toISOString(),
        read: false,
      });
    }
  }

  // Goal met
  const savedGoal = localStorage.getItem(`${GOAL_KEY_PREFIX}${studentId}`);
  const goal = savedGoal ? parseFloat(savedGoal) : null;
  if (goal !== null && !isNaN(goal)) {
    const bestGpa = Math.max(...simulations.map((s) => s.summary.predicted_gpa_mean));
    if (bestGpa >= goal) {
      notifs.push({
        id: `goal-${goal}`,
        type: "goal",
        message: `Goal achieved! Your best predicted GPA (${bestGpa.toFixed(2)}) meets your ${goal.toFixed(1)} target.`,
        timestamp: latest.created_at ?? new Date().toISOString(),
        read: false,
      });
    }
  }

  return notifs;
}

const TYPE_ICONS: Record<AppNotification["type"], string> = {
  burnout: "🔥",
  streak:  "📅",
  goal:    "🎯",
};

export function NotificationBell({ studentId, simulations }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load + merge stored notifications
  useEffect(() => {
    if (!studentId) return;
    const storageKey = `${NOTIF_KEY_PREFIX}${studentId}`;
    let stored: AppNotification[] = [];
    try {
      stored = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    } catch { /* ignore */ }

    const generated = generateNotifications(simulations, studentId);
    const storedIds = new Set(stored.map((n) => n.id));

    // Add newly generated ones that aren't already stored
    const merged = [
      ...stored,
      ...generated.filter((n) => !storedIds.has(n.id)),
    ].slice(-20); // keep max 20

    localStorage.setItem(storageKey, JSON.stringify(merged));
    setNotifications(merged);
  }, [studentId, simulations]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function markRead(id: string) {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      localStorage.setItem(`${NOTIF_KEY_PREFIX}${studentId}`, JSON.stringify(next));
      return next;
    });
  }

  function markAllRead() {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      localStorage.setItem(`${NOTIF_KEY_PREFIX}${studentId}`, JSON.stringify(next));
      return next;
    });
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const visible = notifications.slice(-5).reverse(); // show newest 5

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="relative flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-10 z-50 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
          role="dialog"
          aria-label="Notifications panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          {visible.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">No notifications yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
              {visible.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 transition-colors ${
                    n.read ? "bg-white dark:bg-slate-900" : "bg-brand-50 dark:bg-brand-900/10"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg shrink-0 mt-0.5">{TYPE_ICONS[n.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${n.read ? "text-slate-600 dark:text-slate-400" : "text-slate-900 dark:text-slate-100 font-medium"}`}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {timeAgo(n.timestamp)}
                      </p>
                    </div>
                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="shrink-0 text-[10px] text-brand-600 dark:text-brand-400 hover:underline mt-0.5"
                      >
                        Read
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
