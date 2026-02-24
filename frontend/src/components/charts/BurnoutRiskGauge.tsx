"use client";

import { memo } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import type { BurnoutRisk } from "@/lib/types";

interface BurnoutRiskGaugeProps {
  probability: number;
  risk: BurnoutRisk;
}

const riskColors: Record<BurnoutRisk, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
};

const riskDescriptions: Record<BurnoutRisk, string> = {
  LOW: "Your schedule is sustainable.",
  MEDIUM: "Monitor your workload closely.",
  HIGH: "Immediate schedule adjustment recommended.",
};

export const BurnoutRiskGauge = memo(function BurnoutRiskGauge({ probability, risk }: BurnoutRiskGaugeProps) {
  const percentage = Math.round(probability * 100);
  const color = riskColors[risk];
  const data = [{ value: percentage, fill: color }];

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-48 w-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="60%"
            innerRadius="70%"
            outerRadius="100%"
            barSize={14}
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: "#f1f5f9" }}
              dataKey="value"
              cornerRadius={8}
              angleAxisId={0}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
          <p className="text-2xl font-bold" style={{ color }}>
            {percentage}%
          </p>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color }}>
            {risk}
          </p>
        </div>
      </div>
      <p className="mt-2 text-center text-sm text-gray-500">{riskDescriptions[risk]}</p>
    </div>
  );
});
