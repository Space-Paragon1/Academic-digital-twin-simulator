"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { RetentionHeatmap } from "@/components/charts/RetentionHeatmap";
import { simulationsApi, studentsApi, monteCarloApi, actualGradesApi } from "@/lib/api";
import { useToast } from "@/components/ui/Toaster";
import type {
  ActualGradeEntry,
  MonteCarloResult,
  SimulationResult,
  WeeklySnapshot,
} from "@/lib/types";

function exportToCsv(result: SimulationResult): void {
  const { scenario_config, summary, weekly_snapshots } = result;

  const courseNames    = Object.keys(weekly_snapshots[0]?.course_grades ?? {});
  const retentionNames = Object.keys(weekly_snapshots[0]?.course_retentions ?? {});

  const headers = [
    "week", "predicted_gpa", "cognitive_load", "burnout_probability",
    "fatigue_level", "retention_score", "class_hours", "work_hours",
    "sleep_hours", "deep_study_hours", "shallow_study_hours", "recovery_hours", "social_hours",
    ...courseNames.map((n) => `grade_${n.replace(/\s+/g, "_")}`),
    ...retentionNames.map((n) => `retention_${n.replace(/\s+/g, "_")}`),
  ];

  const rows: (string | number)[][] = weekly_snapshots.map((snap: WeeklySnapshot) => [
    snap.week, snap.predicted_gpa, snap.cognitive_load, snap.burnout_probability,
    snap.fatigue_level, snap.retention_score,
    snap.time_allocation.class_hours, snap.time_allocation.work_hours,
    snap.time_allocation.sleep_hours, snap.time_allocation.deep_study_hours,
    snap.time_allocation.shallow_study_hours, snap.time_allocation.recovery_hours,
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
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `scenario_${result.id ?? "export"}_${scenario_config.study_strategy}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function letterGrade(pct: number): string {
  if (pct >= 93) return "A";
  if (pct >= 90) return "A−";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B−";
  if (pct >= 77) return "C+";
  if (pct >= 73) return "C";
  if (pct >= 70) return "C−";
  if (pct >= 67) return "D+";
  if (pct >= 63) return "D";
  return "F";
}

function interventionTag(snap: WeeklySnapshot): string | null {
  if (snap.burnout_probability > 0.6)  return "🔴 High burnout risk";
  if (snap.cognitive_load > 70)        return "⚠ Reduce load";
  return null;
}

export default function ScenarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }    = use(params);
  const router    = useRouter();
  const [result,        setResult]        = useState<SimulationResult | null>(null);
  const [targetGpa,     setTargetGpa]     = useState<number>(3.5);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [expandedWeek,  setExpandedWeek]  = useState<number | null>(null);

  // Monte Carlo state
  const [mcResult,    setMcResult]    = useState<MonteCarloResult | null>(null);
  const [mcLoading,   setMcLoading]   = useState(false);

  // Actual grades state
  const [actualGrades,     setActualGrades]     = useState<ActualGradeEntry[]>([]);
  const [newGradeCourse,   setNewGradeCourse]   = useState("");
  const [newGradeWeek,     setNewGradeWeek]     = useState(1);
  const [newGradeValue,    setNewGradeValue]    = useState(85);
  const [gradeSaving,      setGradeSaving]      = useState(false);

  const toast = useToast();

  const handleRerun = (sim: SimulationResult) => {
    sessionStorage.setItem("adt_rerun_config", JSON.stringify(sim.scenario_config));
    router.push("/scenarios");
  };

  useEffect(() => {
    const simId = parseInt(id);
    simulationsApi
      .get(simId)
      .then((res) => {
        setResult(res);
        if (res.weekly_snapshots[0]) {
          setNewGradeCourse(Object.keys(res.weekly_snapshots[0].course_grades)[0] ?? "");
        }
        return Promise.all([
          studentsApi.get(res.scenario_config.student_id),
          actualGradesApi.get(simId).catch(() => ({ grades: [] })),
        ]);
      })
      .then(([student, gradesResp]) => {
        setTargetGpa(student.target_gpa);
        setActualGrades(gradesResp.grades);
      })
      .catch(() => setError("Simulation not found."))
      .finally(() => setIsLoading(false));
  }, [id]);

  const runMonteCarlo = async () => {
    if (!result) return;
    setMcLoading(true);
    try {
      const mc = await monteCarloApi.run({
        scenario_config: result.scenario_config,
        monte_carlo: { runs: 200, study_variance: 0.15 },
      });
      setMcResult(mc);
      toast.success(`Monte Carlo complete — ${mc.runs} runs`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Monte Carlo failed.");
    } finally {
      setMcLoading(false);
    }
  };

  const addActualGrade = async () => {
    if (!result?.id || !newGradeCourse) return;
    const newEntry: ActualGradeEntry = {
      course_name:  newGradeCourse,
      week:         newGradeWeek,
      actual_grade: newGradeValue,
    };
    const updated = [...actualGrades.filter(
      (g) => !(g.course_name === newGradeCourse && g.week === newGradeWeek)
    ), newEntry];
    setGradeSaving(true);
    try {
      const resp = await actualGradesApi.save(result.id, updated);
      setActualGrades(resp.grades);
      toast.success("Actual grade saved.");
    } catch {
      toast.error("Failed to save grade.");
    } finally {
      setGradeSaving(false);
    }
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  if (error || !result) return (
    <div className="flex h-64 flex-col items-center justify-center gap-4">
      <p className="text-gray-500">{error ?? "Result not found."}</p>
      <Link href="/scenarios"><Button variant="secondary">Back to Scenarios</Button></Link>
    </div>
  );

  const { summary, weekly_snapshots, scenario_config } = result;
  const lastSnap    = weekly_snapshots[weekly_snapshots.length - 1];
  const courseNames = Object.keys(weekly_snapshots[0]?.course_grades ?? {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/scenarios" className="text-sm text-brand-600 hover:underline">← Scenarios</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {scenario_config.scenario_name ?? `Scenario #${result.id}`}
          </h1>
          <p className="text-sm text-gray-500">
            {scenario_config.num_weeks} weeks · {scenario_config.work_hours_per_week}h work ·{" "}
            {scenario_config.sleep_target_hours}h sleep · {scenario_config.study_strategy} study
            {scenario_config.extracurricular_hours ? ` · ${scenario_config.extracurricular_hours}h extracurricular` : ""}
            {scenario_config.sleep_schedule === "variable" ? " · variable sleep" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => handleRerun(result)}>
            Re-run with Tweaks
          </Button>
          <Button variant="secondary" size="sm" onClick={() => {
            try { exportToCsv(result); toast.success("CSV exported."); }
            catch { toast.error("Export failed."); }
          }}>
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            Export PDF
          </Button>
          <BurnoutBadge risk={summary.burnout_risk} />
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Predicted GPA",   value: summary.predicted_gpa_mean.toFixed(2), sub: `${summary.predicted_gpa_min.toFixed(2)}–${summary.predicted_gpa_max.toFixed(2)}` },
          { label: "Study Required",  value: `${summary.required_study_hours_per_week}h/wk`, sub: "To meet course demand" },
          { label: "Sleep Deficit",   value: `${summary.sleep_deficit_hours}h/wk`, sub: "Below 7h/night baseline" },
          { label: "Overload Weeks",  value: String(summary.peak_overload_weeks.length), sub: summary.peak_overload_weeks.length > 0 ? `Weeks ${summary.peak_overload_weeks.slice(0, 4).join(", ")}` : "None detected" },
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
        <Card
          title="GPA Trajectory"
          subtitle={mcResult ? `Predicted GPA with p10/p50/p90 bands (${mcResult.runs} MC runs)` : "Predicted GPA week over week"}
        >
          <PerformanceTrajectory
            result={result}
            targetGpa={targetGpa}
            monteCarlo={mcResult ?? undefined}
            actualGrades={actualGrades.length > 0 ? actualGrades : undefined}
          />
        </Card>
        <Card title="Burnout Risk Gauge" subtitle="Final semester probability">
          <div className="flex justify-center">
            <BurnoutRiskGauge probability={summary.burnout_probability} risk={summary.burnout_risk} />
          </div>
        </Card>
        <Card title="Time Allocation" subtitle="How the 168-hour week is distributed">
          <TimeAllocationChart allocation={lastSnap.time_allocation} />
        </Card>
      </div>

      {/* Monte Carlo */}
      <Card title="Monte Carlo Confidence Analysis" subtitle="Run 200 simulations with random variance to model real-world uncertainty">
        {mcResult ? (
          <div className="flex flex-wrap gap-6 mt-2 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Pessimistic (p10)</p>
              <p className="text-2xl font-bold text-red-600">{mcResult.p10_gpa.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Median (p50)</p>
              <p className="text-2xl font-bold text-gray-900">{mcResult.p50_gpa.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Optimistic (p90)</p>
              <p className="text-2xl font-bold text-green-600">{mcResult.p90_gpa.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Burnout Prob</p>
              <p className="text-2xl font-bold text-gray-900">{(mcResult.burnout_probability_mean * 100).toFixed(0)}%</p>
            </div>
            <div className="self-end">
              <Button variant="secondary" size="sm" onClick={runMonteCarlo} isLoading={mcLoading}>
                Re-run
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 mt-2">
            <Button onClick={runMonteCarlo} isLoading={mcLoading}>
              {mcLoading ? "Running 200 simulations…" : "Run Monte Carlo (200 sims)"}
            </Button>
            {mcLoading && <p className="text-xs text-gray-400">This takes ~10 seconds.</p>}
          </div>
        )}
      </Card>

      {/* Per-course charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Per-Course Grade Trajectories" subtitle="Predicted grade % per course over the semester">
          <CourseGradesChart snapshots={weekly_snapshots} />
        </Card>
        <Card title="Per-Course Knowledge Retention" subtitle="Cumulative retention score per course (0–100%)">
          <CourseRetentionChart snapshots={weekly_snapshots} />
        </Card>
      </div>

      <Card title="Knowledge Retention Heatmap" subtitle="Per-course retention % each week — red = low, green = high, ★ = exam weeks">
        <RetentionHeatmap snapshots={weekly_snapshots} />
      </Card>

      {/* Actual grades tracker */}
      <Card title="Track Actual Grades" subtitle="Log your real grades to compare against predictions">
        <div className="mt-3 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label htmlFor="grade-course" className="block text-xs font-medium text-gray-600 mb-1">Course</label>
              <select
                id="grade-course"
                title="Course for actual grade"
                value={newGradeCourse}
                onChange={(e) => setNewGradeCourse(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              >
                {courseNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="grade-week" className="block text-xs font-medium text-gray-600 mb-1">Week</label>
              <input
                id="grade-week"
                title="Week number"
                type="number" min={1} max={scenario_config.num_weeks} value={newGradeWeek}
                onChange={(e) => setNewGradeWeek(parseInt(e.target.value))}
                className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-center focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="grade-value" className="block text-xs font-medium text-gray-600 mb-1">Grade (%)</label>
              <input
                id="grade-value"
                title="Actual grade percentage"
                type="number" min={0} max={100} value={newGradeValue}
                onChange={(e) => setNewGradeValue(parseInt(e.target.value))}
                className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-center focus:border-brand-500 focus:outline-none"
              />
            </div>
            <Button size="sm" onClick={addActualGrade} isLoading={gradeSaving}>
              Save Grade
            </Button>
          </div>

          {actualGrades.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase">
                    <th className="text-left py-1.5 pr-4">Course</th>
                    <th className="text-right py-1.5 px-3">Week</th>
                    <th className="text-right py-1.5 px-3">Actual</th>
                    <th className="text-right py-1.5 px-3">Predicted</th>
                    <th className="text-right py-1.5 px-3">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {actualGrades
                    .slice()
                    .sort((a, b) => a.week - b.week || a.course_name.localeCompare(b.course_name))
                    .map((g, i) => {
                      const snap     = weekly_snapshots.find((s) => s.week === g.week);
                      const predicted = snap?.course_grades[g.course_name];
                      const delta    = predicted !== undefined ? g.actual_grade - predicted : null;
                      return (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-1.5 pr-4 text-gray-700">{g.course_name}</td>
                          <td className="text-right py-1.5 px-3 text-gray-500">W{g.week}</td>
                          <td className="text-right py-1.5 px-3 font-medium">
                            {g.actual_grade.toFixed(1)}% ({letterGrade(g.actual_grade)})
                          </td>
                          <td className="text-right py-1.5 px-3 text-gray-500">
                            {predicted !== undefined ? `${predicted.toFixed(1)}%` : "—"}
                          </td>
                          <td className={`text-right py-1.5 px-3 font-medium ${
                            delta === null ? "text-gray-400" : delta >= 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            {delta !== null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Weekly snapshot table */}
      <Card title="Weekly Snapshot Table" subtitle="Click any row to see per-course breakdown · ⚠ = action recommended">
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
                <th className="text-left py-2 pl-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {weekly_snapshots.map((snap) => {
                const isExpanded = expandedWeek === snap.week;
                const snapCourses = Object.keys(snap.course_grades);
                const tag        = interventionTag(snap);
                return (
                  <>
                    <tr
                      key={snap.week}
                      onClick={() => setExpandedWeek(isExpanded ? null : snap.week)}
                      className={`border-b border-gray-100 cursor-pointer select-none transition-colors
                        ${snap.is_exam_week ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}
                        ${isExpanded ? "border-brand-200 bg-brand-50 hover:bg-brand-50" : ""}`}
                    >
                      <td className="py-2 pr-4 font-medium">
                        <span className="flex items-center gap-1.5">
                          <span className="text-gray-400 text-xs">{isExpanded ? "▾" : "▸"}</span>
                          Week {snap.week}
                        </span>
                        {snap.is_exam_week && (
                          <span className="ml-5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 uppercase tracking-wide">
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
                      <td className="text-left py-2 pl-4 text-xs">
                        {tag ? (
                          <span className={`font-medium ${tag.startsWith("🔴") ? "text-red-600" : "text-amber-600"}`}>
                            {tag}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && snapCourses.length > 0 && (
                      <tr key={`${snap.week}-detail`} className="border-b border-brand-100 bg-brand-50">
                        <td colSpan={7} className="px-6 py-3">
                          <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-2">
                            Week {snap.week} — Per-Course Breakdown
                          </p>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
                            {snapCourses.map((name) => {
                              const grade     = snap.course_grades[name];
                              const retention = snap.course_retentions?.[name];
                              return (
                                <div key={name} className="text-xs">
                                  <span className="text-gray-600 truncate block">{name}</span>
                                  <span className="font-semibold text-gray-900">
                                    {grade.toFixed(1)}% ({letterGrade(grade)})
                                  </span>
                                  {retention !== undefined && (
                                    <span className="text-gray-400 ml-1">
                                      · ret {(retention * 100).toFixed(0)}%
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
