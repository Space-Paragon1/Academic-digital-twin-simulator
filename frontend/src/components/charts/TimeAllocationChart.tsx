"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { TimeAllocation } from "@/lib/types";

interface TimeAllocationChartProps {
  allocation: TimeAllocation;
}

const BUCKETS = [
  { key: "sleep_hours" as keyof TimeAllocation, label: "Sleep", color: "#6366f1" },
  { key: "class_hours" as keyof TimeAllocation, label: "Classes", color: "#3b82f6" },
  { key: "deep_study_hours" as keyof TimeAllocation, label: "Deep Study", color: "#10b981" },
  { key: "shallow_study_hours" as keyof TimeAllocation, label: "Shallow Study", color: "#34d399" },
  { key: "work_hours" as keyof TimeAllocation, label: "Work", color: "#f59e0b" },
  { key: "recovery_hours" as keyof TimeAllocation, label: "Recovery", color: "#ec4899" },
  { key: "social_hours" as keyof TimeAllocation, label: "Social", color: "#8b5cf6" },
];

export function TimeAllocationChart({ allocation }: TimeAllocationChartProps) {
  const data = BUCKETS.map((b) => ({
    name: b.label,
    value: parseFloat((allocation[b.key] as number).toFixed(1)),
    color: b.color,
  })).filter((d) => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          formatter={(v: number, name: string) => [`${v}h`, name]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
