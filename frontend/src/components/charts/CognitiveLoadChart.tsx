"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { WeeklySnapshot } from "@/lib/types";

interface CognitiveLoadChartProps {
  snapshots: WeeklySnapshot[];
}

function getLoadColor(load: number): string {
  if (load < 40) return "#22c55e";
  if (load < 70) return "#f59e0b";
  return "#ef4444";
}

const CustomDot = (props: { cx?: number; cy?: number; payload?: WeeklySnapshot }) => {
  const { cx, cy, payload } = props;
  if (!payload || cx === undefined || cy === undefined) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={getLoadColor(payload.cognitive_load)}
      stroke="white"
      strokeWidth={1.5}
    />
  );
};

export function CognitiveLoadChart({ snapshots }: CognitiveLoadChartProps) {
  const data = snapshots.map((s) => ({
    week: `W${s.week}`,
    load: s.cognitive_load,
    fatigue: parseFloat((s.fatigue_level * 100).toFixed(1)),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          formatter={(v: number, name: string) => [
            `${v.toFixed(1)}${name === "load" ? "/100" : "%"}`,
            name === "load" ? "Cognitive Load" : "Fatigue",
          ]}
        />
        <ReferenceLine y={40} stroke="#22c55e" strokeDasharray="4 4" opacity={0.6} label={{ value: "Low", position: "right", fontSize: 10, fill: "#22c55e" }} />
        <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="4 4" opacity={0.6} label={{ value: "Overload", position: "right", fontSize: 10, fill: "#f59e0b" }} />
        <Line
          type="monotone"
          dataKey="load"
          stroke="#6366f1"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="fatigue"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
