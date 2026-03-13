"use client";

import { useMemo, useState } from "react";
import type { SimulationResult } from "@/lib/types";

interface BurnoutHeatmapProps {
  simulations: SimulationResult[];
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

type RiskLevel = "none" | "LOW" | "MEDIUM" | "HIGH";

function riskToColor(risk: RiskLevel): string {
  if (risk === "LOW")    return "bg-green-400 dark:bg-green-500";
  if (risk === "MEDIUM") return "bg-amber-400 dark:bg-amber-500";
  if (risk === "HIGH")   return "bg-red-500 dark:bg-red-500";
  return "bg-slate-100 dark:bg-slate-800";
}

function riskToLabel(risk: RiskLevel): string {
  if (risk === "none") return "No simulation";
  return `${risk} risk`;
}

export function BurnoutHeatmap({ simulations }: BurnoutHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    date: string;
    gpa: string;
    risk: RiskLevel;
  } | null>(null);

  // Build a map: dateString → best simulation that day
  const dayMap = useMemo(() => {
    const map = new Map<string, SimulationResult>();
    for (const sim of simulations) {
      if (!sim.created_at) continue;
      const key = new Date(sim.created_at).toDateString();
      const existing = map.get(key);
      if (!existing || sim.summary.predicted_gpa_mean > existing.summary.predicted_gpa_mean) {
        map.set(key, sim);
      }
    }
    return map;
  }, [simulations]);

  // Build 84-day grid (12 weeks × 7 days), starting from the Monday 12 weeks ago
  const cells = useMemo(() => {
    const today = new Date();
    // Find the most recent Monday
    const dayOfWeek = today.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - mondayOffset - 11 * 7); // go back 11 more weeks

    return Array.from({ length: 84 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toDateString();
      const sim = dayMap.get(key);
      const risk: RiskLevel = sim ? (sim.summary.burnout_risk as RiskLevel) : "none";
      return {
        date: d,
        dateLabel: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        risk,
        gpa: sim ? sim.summary.predicted_gpa_mean.toFixed(2) : null,
        weekNum: Math.floor(i / 7) + 1,
      };
    });
  }, [dayMap]);

  // Group into weeks (columns)
  const weeks = useMemo(() => {
    const result: typeof cells[] = [];
    for (let w = 0; w < 12; w++) {
      result.push(cells.slice(w * 7, w * 7 + 7));
    }
    return result;
  }, [cells]);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Burnout Heatmap</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Last 12 weeks of simulation activity</p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-100 dark:bg-slate-800" /> None
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-400 dark:bg-green-500" /> Low
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400 dark:bg-amber-500" /> Med
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" /> High
          </span>
        </div>
      </div>

      <div className="flex gap-1">
        {/* Day labels column */}
        <div className="flex flex-col gap-1 mr-1 justify-start pt-5">
          {DAY_LABELS.map((d, i) => (
            <span key={i} className="text-[9px] text-slate-400 dark:text-slate-600 h-3 flex items-center">
              {d}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-1 flex-1 overflow-x-auto">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {/* Week number label */}
              <span className="text-[9px] text-slate-400 dark:text-slate-600 text-center leading-none mb-0.5">
                W{wi + 1}
              </span>
              {week.map((cell, di) => (
                <div
                  key={di}
                  className={`h-3 w-3 rounded-sm cursor-pointer transition-opacity hover:opacity-75 ${riskToColor(cell.risk)}`}
                  onMouseEnter={() =>
                    setTooltip({
                      date: cell.dateLabel,
                      gpa: cell.gpa ?? "—",
                      risk: cell.risk,
                    })
                  }
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 inline-flex items-center gap-3">
          <span className="font-medium">{tooltip.date}</span>
          <span>{riskToLabel(tooltip.risk)}</span>
          {tooltip.gpa !== "—" && <span>GPA {tooltip.gpa}</span>}
        </div>
      )}
    </div>
  );
}
