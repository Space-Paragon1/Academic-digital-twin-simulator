"use client";

import { useEffect, useState } from "react";
import type { SimulationResult } from "@/lib/types";

interface Badge {
  id: string;
  emoji: string;
  label: string;
  description: string;
}

const BADGE_DEFS: Badge[] = [
  { id: "first_sim",    emoji: "🧪", label: "First Simulation", description: "Run your first simulation" },
  { id: "on_fire",      emoji: "🔥", label: "On Fire",          description: "3+ simulations in 7 days" },
  { id: "goal_crusher", emoji: "🎯", label: "Goal Crusher",     description: "Hit your GPA goal" },
  { id: "chill_mode",   emoji: "😌", label: "Chill Mode",       description: "Any simulation with LOW burnout risk" },
  { id: "data_driven",  emoji: "📊", label: "Data Driven",      description: "Run 10+ simulations" },
  { id: "gpa_champion", emoji: "🏆", label: "GPA Champion",     description: "Achieve a predicted GPA ≥ 3.8" },
];

function computeUnlocked(simulations: SimulationResult[], studentId: number): Set<string> {
  const unlocked = new Set<string>();

  if (simulations.length >= 1) unlocked.add("first_sim");
  if (simulations.length >= 10) unlocked.add("data_driven");

  const gpaGoalRaw = typeof window !== "undefined"
    ? localStorage.getItem(`adt_gpa_goal_${studentId}`)
    : null;
  const gpaGoal = gpaGoalRaw ? parseFloat(gpaGoalRaw) : 3.5;

  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const recentCount = simulations.filter(
    (s) => s.created_at && now - new Date(s.created_at).getTime() <= sevenDays
  ).length;
  if (recentCount >= 3) unlocked.add("on_fire");

  for (const sim of simulations) {
    const gpa = sim.summary.predicted_gpa_mean;
    if (!isNaN(gpaGoal) && gpa >= gpaGoal) unlocked.add("goal_crusher");
    if (sim.summary.burnout_risk === "LOW") unlocked.add("chill_mode");
    if (gpa >= 3.8) unlocked.add("gpa_champion");
  }

  return unlocked;
}

interface Props {
  simulations: SimulationResult[];
  studentId: number;
}

export function AchievementBadges({ simulations, studentId }: Props) {
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const computed = computeUnlocked(simulations, studentId);

    // Merge with previously unlocked (badges should not be revoked)
    const storageKey = `adt_badges_${studentId}`;
    const stored: string[] = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    const merged = new Set([...stored, ...computed]);
    localStorage.setItem(storageKey, JSON.stringify([...merged]));
    setUnlockedIds(merged);
  }, [simulations, studentId]);

  if (simulations.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {BADGE_DEFS.map((badge) => {
        const unlocked = unlockedIds.has(badge.id);
        return (
          <span
            key={badge.id}
            title={badge.description}
            className={[
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all select-none",
              unlocked
                ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300 shadow-sm"
                : "bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-600 opacity-60 grayscale",
            ].join(" ")}
          >
            <span aria-hidden="true">{badge.emoji}</span>
            {badge.label}
          </span>
        );
      })}
    </div>
  );
}
