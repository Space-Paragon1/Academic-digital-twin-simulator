"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { BurnoutBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { CognitiveLoadChart } from "@/components/charts/CognitiveLoadChart";
import { PerformanceTrajectory } from "@/components/charts/PerformanceTrajectory";
import { BurnoutRiskGauge } from "@/components/charts/BurnoutRiskGauge";
import { TimeAllocationChart } from "@/components/charts/TimeAllocationChart";
import { simulationsApi } from "@/lib/api";
import type { SimulationResult } from "@/lib/types";

export default function ScenarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    simulationsApi
      .get(parseInt(id))
      .then(setResult)
      .catch(() => setError("Simulation not found."))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  if (error || !result) return (
    <div className="flex h-64 flex-col items-center justify-center gap-4">
      <p className="text-gray-500">{error ?? "Result not found."}</p>
      <Link href="/scenarios"><Button variant="secondary">Back to Scenarios</Button></Link>
    </div>
  );

  const { summary, weekly_snapshots, scenario_config } = result;
  const lastSnap = weekly_snapshots[weekly_snapshots.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/scenarios" className="text-sm text-brand-600 hover:underline">← Scenarios</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {scenario_config.scenario_name ?? `Scenario #${result.id}`}
          </h1>
          <p className="text-sm text-gray-500">
            {scenario_config.num_weeks} weeks · {scenario_config.work_hours_per_week}h work ·{" "}
            {scenario_config.sleep_target_hours}h sleep · {scenario_config.study_strategy} study
          </p>
        </div>
        <BurnoutBadge risk={summary.burnout_risk} />
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Predicted GPA", value: summary.predicted_gpa_mean.toFixed(2), sub: `${summary.predicted_gpa_min.toFixed(2)}–${summary.predicted_gpa_max.toFixed(2)}` },
          { label: "Study Required", value: `${summary.required_study_hours_per_week}h/wk`, sub: "To meet course demand" },
          { label: "Sleep Deficit", value: `${summary.sleep_deficit_hours}h/wk`, sub: "Below 7h/night baseline" },
          { label: "Overload Weeks", value: String(summary.peak_overload_weeks.length), sub: summary.peak_overload_weeks.length > 0 ? `Weeks ${summary.peak_overload_weeks.slice(0, 4).join(", ")}` : "None detected" },
        ].map((stat) => (
          <Card key={stat.label} padding="sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
          </Card>
        ))}
      </div>

      {summary.recommendation && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <span className="font-medium">Recommendation: </span>{summary.recommendation}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Cognitive Load" subtitle="Weekly load score with fatigue overlay">
          <CognitiveLoadChart snapshots={weekly_snapshots} />
        </Card>
        <Card title="GPA Trajectory" subtitle="Predicted GPA week over week">
          <PerformanceTrajectory result={result} />
        </Card>
        <Card title="Burnout Risk Gauge" subtitle={`Final semester probability`}>
          <div className="flex justify-center">
            <BurnoutRiskGauge probability={lastSnap.burnout_probability} risk={summary.burnout_risk} />
          </div>
        </Card>
        <Card title="Time Allocation" subtitle="How the 168-hour week is distributed">
          <TimeAllocationChart allocation={lastSnap.time_allocation} />
        </Card>
      </div>

      {/* Weekly table */}
      <Card title="Weekly Snapshot Table">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
                <th className="text-left py-2 pr-4">Week</th>
                <th className="text-right py-2 px-4">GPA</th>
                <th className="text-right py-2 px-4">Load</th>
                <th className="text-right py-2 px-4">Burnout</th>
                <th className="text-right py-2 px-4">Retention</th>
                <th className="text-right py-2 px-4">Fatigue</th>
              </tr>
            </thead>
            <tbody>
              {weekly_snapshots.map((snap) => (
                <tr key={snap.week} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium">Week {snap.week}</td>
                  <td className="text-right py-2 px-4">{snap.predicted_gpa.toFixed(2)}</td>
                  <td className={`text-right py-2 px-4 font-medium ${snap.cognitive_load > 70 ? "text-red-600" : snap.cognitive_load > 40 ? "text-yellow-600" : "text-green-600"}`}>
                    {snap.cognitive_load.toFixed(0)}
                  </td>
                  <td className="text-right py-2 px-4">{(snap.burnout_probability * 100).toFixed(0)}%</td>
                  <td className="text-right py-2 px-4">{(snap.retention_score * 100).toFixed(0)}%</td>
                  <td className="text-right py-2 px-4">{(snap.fatigue_level * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
