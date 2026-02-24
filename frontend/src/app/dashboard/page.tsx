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
import { CourseGradesChart } from "@/components/charts/CourseGradesChart";
import { simulationsApi, studentsApi } from "@/lib/api";
import type { SimulationResult } from "@/lib/types";

const STUDENT_ID_KEY = "adt_student_id";

type TrendDir = "up" | "down" | "flat";

function Trend({ dir, good }: { dir: TrendDir; good: "up" | "down" }) {
  if (dir === "flat") return null;
  const isPositive = dir === good;
  return (
    <span className={`ml-1 text-xs font-semibold ${isPositive ? "text-green-600" : "text-red-500"}`}>
      {dir === "up" ? "▲" : "▼"}
    </span>
  );
}

function trendDir(current: number, previous: number | undefined, threshold = 0.01): TrendDir {
  if (previous === undefined) return "flat";
  const diff = current - previous;
  if (Math.abs(diff) < threshold) return "flat";
  return diff > 0 ? "up" : "down";
}

export default function DashboardPage() {
  const [latestResult, setLatestResult] = useState<SimulationResult | null>(null);
  const [prevResult, setPrevResult] = useState<SimulationResult | null>(null);
  const [targetGpa, setTargetGpa] = useState<number>(3.5);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const studentId = parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0");
    if (!studentId) {
      setIsLoading(false);
      return;
    }
    Promise.all([
      simulationsApi.history(studentId),
      studentsApi.get(studentId),
    ])
      .then(([results, student]) => {
        if (results.length > 0) setLatestResult(results[results.length - 1]);
        if (results.length > 1) setPrevResult(results[results.length - 2]);
        setTargetGpa(student.target_gpa);
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

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-red-500 text-sm">{error}</p>
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
  const prevSummary = prevResult?.summary;
  const prevLastSnap = prevResult?.weekly_snapshots[prevResult.weekly_snapshots.length - 1];

  const summaryCards = [
    {
      label: "Predicted GPA",
      value: summary.predicted_gpa_mean.toFixed(2),
      sub: `${summary.predicted_gpa_min.toFixed(2)}–${summary.predicted_gpa_max.toFixed(2)} range`,
      trend: trendDir(summary.predicted_gpa_mean, prevSummary?.predicted_gpa_mean, 0.05),
      trendGood: "up" as const,
    },
    {
      label: "Cognitive Load",
      value: `${lastSnap.cognitive_load.toFixed(0)}/100`,
      sub: "Last week",
      trend: trendDir(lastSnap.cognitive_load, prevLastSnap?.cognitive_load, 2),
      trendGood: "down" as const,
    },
    {
      label: "Retention Score",
      value: `${(lastSnap.retention_score * 100).toFixed(0)}%`,
      sub: "Average knowledge retained",
      trend: trendDir(lastSnap.retention_score, prevLastSnap?.retention_score, 0.01),
      trendGood: "up" as const,
    },
    {
      label: "Sleep Deficit",
      value: `${summary.sleep_deficit_hours.toFixed(1)}h/wk`,
      sub: "Cumulative this semester",
      trend: trendDir(summary.sleep_deficit_hours, prevSummary?.sleep_deficit_hours, 0.2),
      trendGood: "down" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Latest simulation results
            {prevResult && <span className="ml-2 text-xs text-gray-400">· arrows vs previous scenario</span>}
          </p>
        </div>
        <Link href="/scenarios">
          <Button variant="secondary" size="sm">Run New Scenario</Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((stat) => (
          <Card key={stat.label} padding="sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stat.value}
              <Trend dir={stat.trend} good={stat.trendGood} />
            </p>
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
          <PerformanceTrajectory result={latestResult} targetGpa={targetGpa} />
        </Card>
        <Card title="Burnout Risk" subtitle="Probability based on load, sleep, and recovery history">
          <div className="flex justify-center">
            <BurnoutRiskGauge
              probability={summary.burnout_probability}
              risk={summary.burnout_risk}
            />
          </div>
        </Card>
        <Card title="Weekly Time Allocation" subtitle="How your 168 hours are distributed">
          <TimeAllocationChart allocation={lastSnap.time_allocation} />
        </Card>
      </div>

      {/* Per-course grade trajectories */}
      <Card title="Per-Course Grade Trajectories" subtitle="Predicted grade % per course across the semester">
        <CourseGradesChart snapshots={weekly_snapshots} />
      </Card>
    </div>
  );
}
