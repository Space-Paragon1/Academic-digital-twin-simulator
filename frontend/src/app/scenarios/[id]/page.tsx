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
import { CourseGradesChart } from "@/components/charts/CourseGradesChart";
import { CourseRetentionChart } from "@/components/charts/CourseRetentionChart";
import { simulationsApi, studentsApi } from "@/lib/api";
import { useToast } from "@/components/ui/Toaster";
import type { SimulationResult, WeeklySnapshot } from "@/lib/types";

function exportToCsv(result: SimulationResult): void {
  const { scenario_config, summary, weekly_snapshots } = result;

  // Collect all course names for dynamic columns
  const courseNames = Object.keys(weekly_snapshots[0]?.course_grades ?? {});
  const retentionNames = Object.keys(weekly_snapshots[0]?.course_retentions ?? {});

  const headers = [
    "week",
    "predicted_gpa",
    "cognitive_load",
    "burnout_probability",
    "fatigue_level",
    "retention_score",
    "class_hours",
    "work_hours",
    "sleep_hours",
    "deep_study_hours",
    "shallow_study_hours",
    "recovery_hours",
    "social_hours",
    ...courseNames.map((n) => `grade_${n.replace(/\s+/g, "_")}`),
    ...retentionNames.map((n) => `retention_${n.replace(/\s+/g, "_")}`),
  ];

  const rows: (string | number)[][] = weekly_snapshots.map((snap: WeeklySnapshot) => [
    snap.week,
    snap.predicted_gpa,
    snap.cognitive_load,
    snap.burnout_probability,
    snap.fatigue_level,
    snap.retention_score,
    snap.time_allocation.class_hours,
    snap.time_allocation.work_hours,
    snap.time_allocation.sleep_hours,
    snap.time_allocation.deep_study_hours,
    snap.time_allocation.shallow_study_hours,
    snap.time_allocation.recovery_hours,
    snap.time_allocation.social_hours,
    ...courseNames.map((n) => snap.course_grades[n] ?? ""),
    ...retentionNames.map((n) => snap.course_retentions?.[n]?.toFixed(3) ?? ""),
  ]);

  const csvLines = [
    `# Scenario: ${scenario_config.scenario_name ?? `#${result.id}`}`,
    `# Strategy: ${scenario_config.study_strategy} | Work: ${scenario_config.work_hours_per_week}h/wk | Sleep: ${scenario_config.sleep_target_hours}h/night`,
    `# GPA: ${summary.predicted_gpa_mean} | Burnout Risk: ${summary.burnout_risk} (${(summary.burnout_probability * 100).toFixed(0)}%)`,
    headers.join(","),
    ...rows.map((r) => r.join(",")),
  ];

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const filename = `scenario_${result.id ?? "export"}_${scenario_config.study_strategy}.csv`;
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ScenarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [targetGpa, setTargetGpa] = useState<number>(3.5);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    simulationsApi
      .get(parseInt(id))
      .then((res) => {
        setResult(res);
        return studentsApi.get(res.scenario_config.student_id);
      })
      .then((student) => setTargetGpa(student.target_gpa))
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
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              try {
                exportToCsv(result);
                toast.success("CSV exported successfully.");
              } catch {
                toast.error("Failed to export CSV. Please try again.");
              }
            }}
          >
            Export CSV
          </Button>
          <BurnoutBadge risk={summary.burnout_risk} />
        </div>
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
          <PerformanceTrajectory result={result} targetGpa={targetGpa} />
        </Card>
        <Card title="Burnout Risk Gauge" subtitle={`Final semester probability`}>
          <div className="flex justify-center">
            <BurnoutRiskGauge probability={summary.burnout_probability} risk={summary.burnout_risk} />
          </div>
        </Card>
        <Card title="Time Allocation" subtitle="How the 168-hour week is distributed">
          <TimeAllocationChart allocation={lastSnap.time_allocation} />
        </Card>
      </div>

      {/* Per-course charts side-by-side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Per-Course Grade Trajectories"
          subtitle="Predicted grade % per course over the semester"
        >
          <CourseGradesChart snapshots={weekly_snapshots} />
        </Card>
        <Card
          title="Per-Course Knowledge Retention"
          subtitle="Cumulative retention score per course (0–100%)"
        >
          <CourseRetentionChart snapshots={weekly_snapshots} />
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
                <tr
                  key={snap.week}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${snap.is_exam_week ? "bg-red-50" : ""}`}
                >
                  <td className="py-2 pr-4 font-medium">
                    <span>Week {snap.week}</span>
                    {snap.is_exam_week && (
                      <span className="ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 uppercase tracking-wide">
                        Exam
                      </span>
                    )}
                  </td>
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
