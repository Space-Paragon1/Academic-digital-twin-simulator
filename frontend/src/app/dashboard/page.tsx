"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { BurnoutBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { CognitiveLoadChart } from "@/components/charts/CognitiveLoadChart";
import { PerformanceTrajectory } from "@/components/charts/PerformanceTrajectory";
import { BurnoutRiskGauge } from "@/components/charts/BurnoutRiskGauge";
import { TimeAllocationChart } from "@/components/charts/TimeAllocationChart";
import { simulationsApi } from "@/lib/api";
import type { SimulationResult } from "@/lib/types";

const STUDENT_ID_KEY = "adt_student_id";

export default function DashboardPage() {
  const [latestResult, setLatestResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const studentId = parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0");
    if (!studentId) {
      setIsLoading(false);
      return;
    }
    simulationsApi
      .history(studentId)
      .then((results) => {
        if (results.length > 0) setLatestResult(results[results.length - 1]);
      })
      .catch(() => setError("Failed to load simulation history."))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!latestResult) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <p className="text-gray-500">No simulation results yet.</p>
        <Link href="/profile">
          <Button>Set Up Profile &amp; Run Simulation</Button>
        </Link>
      </div>
    );
  }

  const { summary, weekly_snapshots } = latestResult;
  const lastSnap = weekly_snapshots[weekly_snapshots.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Latest simulation results</p>
        </div>
        <Link href="/scenarios">
          <Button variant="secondary" size="sm">Run New Scenario</Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Predicted GPA", value: summary.predicted_gpa_mean.toFixed(2), sub: `${summary.predicted_gpa_min.toFixed(2)}–${summary.predicted_gpa_max.toFixed(2)} range` },
          { label: "Cognitive Load", value: `${lastSnap.cognitive_load.toFixed(0)}/100`, sub: "Last week" },
          { label: "Retention Score", value: `${(lastSnap.retention_score * 100).toFixed(0)}%`, sub: "Average knowledge retained" },
          { label: "Sleep Deficit", value: `${summary.sleep_deficit_hours.toFixed(1)}h/wk`, sub: "Cumulative this semester" },
        ].map((stat) => (
          <Card key={stat.label} padding="sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
          </Card>
        ))}
      </div>

      {/* Burnout risk */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Burnout Risk:</span>
        <BurnoutBadge risk={summary.burnout_risk} />
        {summary.peak_overload_weeks.length > 0 && (
          <span className="text-sm text-gray-500">
            Peak load in weeks {summary.peak_overload_weeks.slice(0, 4).join(", ")}
          </span>
        )}
      </div>

      {/* Recommendation */}
      {summary.recommendation && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {summary.recommendation}
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Cognitive Load Over Semester" subtitle="Load score 0–100 per week">
          <CognitiveLoadChart snapshots={weekly_snapshots} />
        </Card>
        <Card title="GPA Trajectory" subtitle="Predicted GPA progression with confidence band">
          <PerformanceTrajectory result={latestResult} />
        </Card>
        <Card title="Burnout Risk" subtitle="Probability based on load, sleep, and recovery history">
          <div className="flex justify-center">
            <BurnoutRiskGauge
              probability={lastSnap.burnout_probability}
              risk={summary.burnout_risk}
            />
          </div>
        </Card>
        <Card title="Weekly Time Allocation" subtitle="How your 168 hours are distributed">
          <TimeAllocationChart allocation={lastSnap.time_allocation} />
        </Card>
      </div>
    </div>
  );
}
