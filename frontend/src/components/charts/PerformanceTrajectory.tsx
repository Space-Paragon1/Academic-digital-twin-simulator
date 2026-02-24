"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { SimulationResult } from "@/lib/types";

interface PerformanceTrajectoryProps {
  result: SimulationResult;
  targetGpa?: number;
}

export function PerformanceTrajectory({ result, targetGpa = 3.5 }: PerformanceTrajectoryProps) {
  const std = (result.summary.predicted_gpa_max - result.summary.predicted_gpa_min) / 2;

  const data = result.weekly_snapshots.map((s) => ({
    week: `W${s.week}`,
    gpa: s.predicted_gpa,
    gpa_upper: Math.min(4.0, s.predicted_gpa + std * 0.5),
    gpa_lower: Math.max(0.0, s.predicted_gpa - std * 0.5),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gpaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
          formatter={(v: number, name: string) => [
            v.toFixed(2),
            name === "gpa" ? "Predicted GPA" : name === "gpa_upper" ? "Upper Bound" : "Lower Bound",
          ]}
        />
        <ReferenceLine
          y={targetGpa}
          stroke="#10b981"
          strokeDasharray="5 5"
          label={{ value: "Target", position: "right", fontSize: 10, fill: "#10b981" }}
        />
        <Area type="monotone" dataKey="gpa_upper" stroke="none" fill="url(#gpaGradient)" />
        <Area type="monotone" dataKey="gpa_lower" stroke="none" fill="white" />
        <Area
          type="monotone"
          dataKey="gpa"
          stroke="#3b82f6"
          strokeWidth={2.5}
          fill="url(#gpaGradient)"
          dot={false}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
