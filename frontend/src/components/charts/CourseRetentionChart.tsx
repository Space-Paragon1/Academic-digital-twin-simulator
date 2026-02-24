"use client";

import { memo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { WeeklySnapshot } from "@/lib/types";

interface CourseRetentionChartProps {
  snapshots: WeeklySnapshot[];
}

const COURSE_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#0ea5e9",
  "#f97316",
  "#06b6d4",
];

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm text-xs">
      <p className="font-semibold text-gray-700 mb-2">Week {label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 mb-0.5">
          <span style={{ color: entry.color }} className="font-medium truncate max-w-[120px]">
            {entry.name}
          </span>
          <span className="font-semibold text-gray-800">
            {(entry.value * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export const CourseRetentionChart = memo(function CourseRetentionChart({ snapshots }: CourseRetentionChartProps) {
  if (!snapshots.length) return null;

  // Fall back gracefully for older simulation records without per-course retention
  const firstRetentions = snapshots[0].course_retentions ?? {};
  const courseNames = Object.keys(firstRetentions);
  if (!courseNames.length) {
    return (
      <p className="text-sm text-gray-400 italic py-4 text-center">
        Retention data not available for this simulation.
      </p>
    );
  }

  const data = snapshots.map((s) => ({
    week: s.week,
    ...Object.fromEntries(
      courseNames.map((name) => [name, s.course_retentions?.[name] ?? null])
    ),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
        <defs>
          {courseNames.map((name, i) => (
            <linearGradient key={name} id={`ret-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COURSE_COLORS[i % COURSE_COLORS.length]} stopOpacity={0.15} />
              <stop offset="95%" stopColor={COURSE_COLORS[i % COURSE_COLORS.length]} stopOpacity={0.0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          label={{ value: "Week", position: "insideBottomRight", offset: -4, fontSize: 11, fill: "#9ca3af" }}
        />
        <YAxis
          domain={[0, 1]}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value) => (
            <span className="text-gray-700 text-xs">{value}</span>
          )}
        />
        {courseNames.map((name, i) => (
          <Area
            key={name}
            type="monotone"
            dataKey={name}
            stroke={COURSE_COLORS[i % COURSE_COLORS.length]}
            fill={`url(#ret-grad-${i})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
});
