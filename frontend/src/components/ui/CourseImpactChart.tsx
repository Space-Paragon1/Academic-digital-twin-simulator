"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Course, SimulationResult } from "@/lib/types";

interface CourseImpactChartProps {
  courses: Course[];
  simulation: SimulationResult; // kept for context / future use
}

function impactScore(course: Course): number {
  const raw =
    (course.difficulty_score * course.credits * (course.weekly_workload_hours ?? 0)) / 10;
  // Normalize to 0–100 using a reasonable ceiling
  return Math.min(Math.round(raw), 100);
}

function barColor(score: number): string {
  if (score > 70) return "#ef4444";
  if (score > 40) return "#f59e0b";
  return "#22c55e";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CourseImpactChart({ courses, simulation: _simulation }: CourseImpactChartProps) {
  const data = courses
    .map((c) => ({
      name: c.name.length > 18 ? c.name.slice(0, 16) + "…" : c.name,
      fullName: c.name,
      score: impactScore(c),
    }))
    .sort((a, b) => b.score - a.score);

  const chartHeight = Math.max(200, data.length * 36);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Course Impact Breakdown</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Impact score = difficulty × credits × weekly workload / 10
        </p>
      </div>
      <ResponsiveContainer width="100%" height={Math.min(chartHeight, 300)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            label={{ value: "Impact Score", position: "insideBottomRight", offset: -4, fontSize: 10, fill: "#94a3b8" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip
            formatter={(value: number, _name: string, props: { payload?: { fullName: string } }) => [
              `${value} / 100`,
              props.payload?.fullName ?? "Impact Score",
            ]}
            contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((entry, i) => (
              <Cell key={i} fill={barColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-green-500" /> Low (&le;40)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-amber-400" /> Medium (41–70)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-red-500" /> High (&gt;70)
        </span>
      </div>
    </div>
  );
}
