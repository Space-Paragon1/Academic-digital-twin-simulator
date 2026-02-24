"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { WeeklySnapshot } from "@/lib/types";

interface CourseGradesChartProps {
  snapshots: WeeklySnapshot[];
}

// Distinct, accessible color palette for up to 8 courses
const COURSE_COLORS = [
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // violet
  "#0ea5e9", // sky
  "#f97316", // orange
  "#06b6d4", // cyan
];

const GRADE_THRESHOLDS = [
  { value: 93, label: "A", color: "#22c55e" },
  { value: 83, label: "B", color: "#84cc16" },
  { value: 73, label: "C", color: "#f59e0b" },
  { value: 63, label: "D", color: "#f97316" },
];

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function gradeLabel(pct: number): string {
  if (pct >= 93) return "A";
  if (pct >= 90) return "A-";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B-";
  if (pct >= 77) return "C+";
  if (pct >= 73) return "C";
  if (pct >= 70) return "C-";
  if (pct >= 67) return "D+";
  if (pct >= 63) return "D";
  if (pct >= 60) return "D-";
  return "F";
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
            {entry.value.toFixed(1)}% ({gradeLabel(entry.value)})
          </span>
        </div>
      ))}
    </div>
  );
}

export function CourseGradesChart({ snapshots }: CourseGradesChartProps) {
  if (!snapshots.length) return null;

  const courseNames = Object.keys(snapshots[0].course_grades);

  const data = snapshots.map((s) => ({
    week: s.week,
    ...Object.fromEntries(
      courseNames.map((name) => [name, s.course_grades[name] ?? null])
    ),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          label={{ value: "Week", position: "insideBottomRight", offset: -4, fontSize: 11, fill: "#9ca3af" }}
        />
        <YAxis
          domain={[40, 100]}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value) => (
            <span className="text-gray-700 text-xs">{value}</span>
          )}
        />

        {GRADE_THRESHOLDS.map(({ value, label, color }) => (
          <ReferenceLine
            key={label}
            y={value}
            stroke={color}
            strokeDasharray="4 3"
            opacity={0.5}
            label={{ value: label, position: "insideTopRight", fontSize: 10, fill: color }}
          />
        ))}

        {courseNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={COURSE_COLORS[i % COURSE_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
