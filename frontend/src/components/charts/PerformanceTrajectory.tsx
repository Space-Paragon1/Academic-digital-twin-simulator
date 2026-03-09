"use client";

import { memo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ActualGradeEntry, MonteCarloResult, SimulationResult } from "@/lib/types";

interface PerformanceTrajectoryProps {
  result: SimulationResult;
  targetGpa?: number;
  monteCarlo?: MonteCarloResult;
  actualGrades?: ActualGradeEntry[];
}

export const PerformanceTrajectory = memo(function PerformanceTrajectory({
  result,
  targetGpa = 3.5,
  monteCarlo,
  actualGrades,
}: PerformanceTrajectoryProps) {
  const std = (result.summary.predicted_gpa_max - result.summary.predicted_gpa_min) / 2;

  // Group actual grades by week and convert percentage → GPA scale
  const actualByWeek: Record<number, number> = {};
  if (actualGrades && actualGrades.length > 0) {
    const weekMap: Record<number, number[]> = {};
    for (const g of actualGrades) {
      if (!weekMap[g.week]) weekMap[g.week] = [];
      weekMap[g.week].push(g.actual_grade);
    }
    for (const [week, grades] of Object.entries(weekMap)) {
      const avgPct = grades.reduce((a, b) => a + b, 0) / grades.length;
      actualByWeek[Number(week)] = Math.min(4.0, (avgPct / 100) * 4.0);
    }
  }

  const data = result.weekly_snapshots.map((s, i) => ({
    week: `W${s.week}`,
    gpa: s.predicted_gpa,
    gpa_upper: monteCarlo
      ? (monteCarlo.weekly_p90[i] ?? Math.min(4.0, s.predicted_gpa + std * 0.5))
      : Math.min(4.0, s.predicted_gpa + std * 0.5),
    gpa_lower: monteCarlo
      ? (monteCarlo.weekly_p10[i] ?? Math.max(0.0, s.predicted_gpa - std * 0.5))
      : Math.max(0.0, s.predicted_gpa - std * 0.5),
    actual_gpa: actualByWeek[s.week] !== undefined ? actualByWeek[s.week] : null,
  }));

  const examWeekLabels = result.weekly_snapshots
    .filter((s) => s.is_exam_week)
    .map((s) => `W${s.week}`);

  const hasActual = actualGrades && actualGrades.length > 0;

  return (
    <div className="space-y-2">
      {monteCarlo && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 px-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-slate-300 opacity-70" />
            p10–p90 confidence ({monteCarlo.runs} runs)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 border-t-2 border-blue-500" />
            Predicted
          </span>
          {hasActual && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              Actual
            </span>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gpaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="mcBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 4.0]}
            ticks={[0, 1.0, 2.0, 3.0, 3.5, 4.0]}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(v: number | null, name: string) => {
              if (v === null || v === undefined) return ["-", ""];
              const labels: Record<string, string> = {
                gpa: "Predicted GPA",
                gpa_upper: monteCarlo ? "p90 optimistic" : "Upper bound",
                gpa_lower: monteCarlo ? "p10 pessimistic" : "Lower bound",
                actual_gpa: "Actual GPA",
              };
              return [(v as number).toFixed(2), labels[name] ?? name];
            }}
          />

          <ReferenceLine
            y={targetGpa}
            stroke="#10b981"
            strokeDasharray="5 5"
            label={{ value: "Target", position: "right", fontSize: 10, fill: "#10b981" }}
          />
          {examWeekLabels.map((w) => (
            <ReferenceLine
              key={w}
              x={w}
              stroke="#ef4444"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              label={{ value: "Exam", position: "top", fontSize: 9, fill: "#ef4444" }}
            />
          ))}

          {/* Confidence band upper */}
          <Area
            type="monotone"
            dataKey="gpa_upper"
            stroke="none"
            fill={monteCarlo ? "url(#mcBand)" : "url(#gpaGradient)"}
          />
          {/* White fill to create band effect */}
          <Area type="monotone" dataKey="gpa_lower" stroke="none" fill="white" />

          {/* Predicted GPA main line */}
          <Area
            type="monotone"
            dataKey="gpa"
            stroke="#3b82f6"
            strokeWidth={2.5}
            fill={monteCarlo ? "none" : "url(#gpaGradient)"}
            dot={false}
            activeDot={{ r: 5 }}
          />

          {/* Actual grade overlay */}
          {hasActual && (
            <Line
              type="monotone"
              dataKey="actual_gpa"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});
