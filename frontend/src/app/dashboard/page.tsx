"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { BurnoutBadge } from "@/components/ui/Badge";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Button } from "@/components/ui/Button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { CognitiveLoadChart } from "@/components/charts/CognitiveLoadChart";
import { PerformanceTrajectory } from "@/components/charts/PerformanceTrajectory";
import { BurnoutRiskGauge } from "@/components/charts/BurnoutRiskGauge";
import { TimeAllocationChart } from "@/components/charts/TimeAllocationChart";
import { CourseGradesChart } from "@/components/charts/CourseGradesChart";
import { AchievementBadges } from "@/components/ui/AchievementBadges";
import { simulationsApi, studentsApi, accountApi, monteCarloApi } from "@/lib/api";
import { useToast } from "@/components/ui/Toaster";
import type { MonteCarloResult, SimulationResult } from "@/lib/types";

const STUDENT_ID_KEY = "adt_student_id";
const GPA_GOAL_KEY_PREFIX = "adt_gpa_goal_";

type TrendDir = "up" | "down" | "flat";

function Trend({ dir, good }: { dir: TrendDir; good: "up" | "down" }) {
  if (dir === "flat") return null;
  const isPositive = dir === good;
  return (
    <span className={`ml-1 text-xs font-semibold ${isPositive ? "text-green-500" : "text-red-500"}`}>
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

function computeStreak(results: SimulationResult[]): number {
  if (results.length === 0) return 0;
  const dateSet = new Set(
    results.filter((r) => r.created_at).map((r) => new Date(r.created_at!).toDateString())
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (dateSet.has(d.toDateString())) streak++;
    else break;
  }
  return streak;
}

function daysSinceLast(results: SimulationResult[]): number | null {
  const withDate = results.filter((r) => r.created_at);
  if (withDate.length === 0) return null;
  const last = new Date(withDate[withDate.length - 1].created_at!);
  return Math.floor((Date.now() - last.getTime()) / 86_400_000);
}

function GoalProgressWidget({ predicted, target }: { predicted: number; target: number }) {
  const pct = Math.min((predicted / target) * 100, 100);
  const onTrack = predicted >= target * 0.97;
  const gap = target - predicted;
  return (
    <Card accent padding="sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Goal Progress
        </p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          onTrack
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        }`}>
          {onTrack ? "On Track" : `${gap.toFixed(2)} below target`}
        </span>
      </div>
      <div className="flex items-end gap-2 mb-2">
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{predicted.toFixed(2)}</span>
        <span className="text-sm text-slate-400 dark:text-slate-500 mb-0.5">/ {target.toFixed(1)} target GPA</span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`progress-bar-fill h-full rounded-full transition-all duration-700 ${
            onTrack
              ? "bg-gradient-to-r from-green-400 to-emerald-500"
              : "bg-gradient-to-r from-amber-400 to-orange-500"
          }`}
          style={{ "--progress-width": `${pct}%` } as React.CSSProperties}
        />
      </div>
      <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{pct.toFixed(0)}% of target achieved</p>
    </Card>
  );
}

export default function DashboardPage() {
  const [latestResult, setLatestResult] = useState<SimulationResult | null>(null);
  const [prevResult, setPrevResult] = useState<SimulationResult | null>(null);
  const [allResults, setAllResults] = useState<SimulationResult[]>([]);
  const [targetGpa, setTargetGpa] = useState<number>(3.5);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  // Feature 4: Monte Carlo confidence bands
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);
  const [mcLoading, setMcLoading] = useState(false);
  // Feature 5: GPA Goal Tracker
  const [studentId, setStudentId] = useState<number>(0);
  const [gpaGoal, setGpaGoal] = useState<number>(3.5);
  const [gpaGoalInput, setGpaGoalInput] = useState<string>("3.5");
  const toast = useToast();

  useEffect(() => {
    const sid = parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0");
    if (!sid) { setIsLoading(false); return; }
    setStudentId(sid);
    // Load saved GPA goal
    const savedGoal = localStorage.getItem(`${GPA_GOAL_KEY_PREFIX}${sid}`);
    if (savedGoal) {
      const parsed = parseFloat(savedGoal);
      if (!isNaN(parsed)) {
        setGpaGoal(parsed);
        setGpaGoalInput(String(parsed));
      }
    }
    Promise.all([simulationsApi.history(sid), studentsApi.get(sid)])
      .then(([results, student]) => {
        setAllResults(results);
        if (results.length > 0) setLatestResult(results[results.length - 1]);
        if (results.length > 1) setPrevResult(results[results.length - 2]);
        setTargetGpa(student.target_gpa);
        // Use student target_gpa as default goal if none saved
        if (!savedGoal) {
          setGpaGoal(student.target_gpa);
          setGpaGoalInput(String(student.target_gpa));
        }
      })
      .catch(() => setError("Failed to load simulation history."))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!latestResult) {
    const hasProfile = !!parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0");
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          {hasProfile ? "No simulations yet." : "Welcome! Let's get you set up."}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          {hasProfile
            ? "Head to Scenarios to run your first simulation."
            : "Create your student profile and add your courses, then run a scenario to see predictions here."}
        </p>
        <Link href={hasProfile ? "/scenarios" : "/profile"}>
          <Button>{hasProfile ? "Run a Scenario" : "Create Profile"}</Button>
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
      label: "Cognitive Load",
      value: `${lastSnap.cognitive_load.toFixed(0)}/100`,
      sub: "Last week",
      trend: trendDir(lastSnap.cognitive_load, prevLastSnap?.cognitive_load, 2),
      trendGood: "down" as const,
    },
    {
      label: "Retention Score",
      value: `${(lastSnap.retention_score * 100).toFixed(0)}%`,
      sub: "Knowledge retained",
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
    {
      label: "Study Hours Needed",
      value: `${summary.required_study_hours_per_week.toFixed(1)}h`,
      sub: "Per week recommended",
      trend: trendDir(summary.required_study_hours_per_week, prevSummary?.required_study_hours_per_week, 0.5),
      trendGood: "down" as const,
    },
  ];

  const streak = computeStreak(allResults);
  const daysSince = daysSinceLast(allResults);
  const showNudge = !nudgeDismissed && daysSince !== null && daysSince >= 7;

  return (
    <div className="space-y-6">
      {/* Nudge banner */}
      {showNudge && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            You haven&apos;t run a simulation in <strong>{daysSince} days</strong>. Run one to keep your predictions up to date.
          </p>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            <Link href="/scenarios">
              <Button size="sm">Run Now</Button>
            </Link>
            <button type="button" onClick={() => setNudgeDismissed(true)} className="text-amber-500 hover:text-amber-700 text-lg leading-none px-1" aria-label="Dismiss">×</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Latest simulation results
            {prevResult && (
              <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                · arrows vs previous scenario
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 px-3 py-1">
              <span className="text-base leading-none">🔥</span>
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">{streak}-day streak</span>
            </div>
          )}
          <Button
            variant="secondary"
            size="sm"
            isLoading={summaryLoading}
            onClick={async () => {
              const sid = parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0");
              if (!sid) return;
              setSummaryLoading(true);
              try {
                await accountApi.sendSummary(sid);
                toast.success("Summary email sent to your inbox!");
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to send summary.");
              } finally {
                setSummaryLoading(false);
              }
            }}
          >
            Email Summary
          </Button>
          <Button
            variant="secondary"
            size="sm"
            title="Opens the browser print dialog — save as PDF to download a report"
            onClick={() => window.print()}
          >
            Download Report
          </Button>
          <Link href="/scenarios">
            <Button variant="secondary" size="sm">Run New Scenario</Button>
          </Link>
        </div>
      </div>

      {/* Goal progress + burnout */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GoalProgressWidget predicted={summary.predicted_gpa_mean} target={targetGpa} />
        <Card padding="sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            Burnout Risk
          </p>
          <div className="flex items-center gap-3 mb-2">
            <BurnoutBadge risk={summary.burnout_risk} />
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {(summary.burnout_probability * 100).toFixed(0)}%
            </span>
          </div>
          {summary.peak_overload_weeks.length > 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Peak load in weeks {summary.peak_overload_weeks.slice(0, 4).join(", ")}
            </p>
          ) : (
            <p className="text-xs text-green-600 dark:text-green-400">No overload weeks detected</p>
          )}
        </Card>
      </div>

      {/* Feature 5: GPA Goal Tracker */}
      {(() => {
        const bestGpa = allResults.length > 0
          ? Math.max(...allResults.map((r) => r.summary.predicted_gpa_mean))
          : summary.predicted_gpa_mean;
        const pct = Math.min((bestGpa / gpaGoal) * 100, 100);
        const met = bestGpa >= gpaGoal;
        const close = !met && gpaGoal - bestGpa <= 0.2;
        const barColor = met
          ? "bg-gradient-to-r from-green-400 to-emerald-500"
          : close
          ? "bg-gradient-to-r from-amber-400 to-orange-500"
          : "bg-gradient-to-r from-red-400 to-rose-500";
        const badgeColor = met
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : close
          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
        return (
          <Card padding="sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                GPA Goal
              </p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                {met ? "Goal Met!" : close ? "Almost there" : `${(gpaGoal - bestGpa).toFixed(2)} to go`}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{bestGpa.toFixed(2)}</span>
                  <span className="text-sm text-slate-400 dark:text-slate-500 mb-0.5">/ {gpaGoal.toFixed(1)} goal</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`progress-bar-fill h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ "--progress-width": `${pct}%` } as React.CSSProperties}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{pct.toFixed(0)}% of goal achieved (best sim)</p>
              </div>
              <div className="shrink-0">
                <label
                  htmlFor="gpa-goal-input"
                  className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                >
                  Set Goal
                </label>
                <input
                  id="gpa-goal-input"
                  type="number"
                  min={0}
                  max={4.0}
                  step={0.1}
                  value={gpaGoalInput}
                  aria-label="Target GPA goal (0 to 4.0)"
                  onChange={(e) => setGpaGoalInput(e.target.value)}
                  onBlur={() => {
                    const val = parseFloat(gpaGoalInput);
                    if (!isNaN(val) && val >= 0 && val <= 4.0) {
                      setGpaGoal(val);
                      if (studentId) localStorage.setItem(`${GPA_GOAL_KEY_PREFIX}${studentId}`, String(val));
                    }
                  }}
                  className="w-16 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-center font-semibold text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Achievement Badges */}
      {studentId > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            Achievements
          </p>
          <AchievementBadges simulations={allResults} studentId={studentId} />
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((stat) => (
          <Card key={stat.label} padding="sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {stat.value}
              <Trend dir={stat.trend} good={stat.trendGood} />
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{stat.sub}</p>
          </Card>
        ))}
      </div>

      {/* Feature 4: GPA Confidence Bands */}
      <Card title="GPA Confidence Analysis" subtitle="Monte Carlo simulation — run 200 scenarios to see p10/p50/p90 GPA bands">
        {mcResult ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-red-500 dark:text-red-400">P10 (Pessimistic)</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">{mcResult.p10_gpa.toFixed(2)}</p>
                <p className="text-xs text-red-400 mt-0.5">10th percentile</p>
              </div>
              <div className="text-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-500 dark:text-indigo-400">P50 (Median)</p>
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mt-1">{mcResult.p50_gpa.toFixed(2)}</p>
                <p className="text-xs text-indigo-400 mt-0.5">50th percentile</p>
              </div>
              <div className="text-center rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-green-500 dark:text-green-400">P90 (Optimistic)</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">{mcResult.p90_gpa.toFixed(2)}</p>
                <p className="text-xs text-green-400 mt-0.5">90th percentile</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Based on {mcResult.runs} Monte Carlo runs with ±15% study variance. Mean burnout probability: {(mcResult.burnout_probability_mean * 100).toFixed(0)}%.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMcResult(null)}
            >
              Clear Results
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Run a Monte Carlo analysis on your latest scenario to see optimistic, median, and pessimistic GPA outcomes.
            </p>
            <Button
              size="sm"
              isLoading={mcLoading}
              onClick={async () => {
                if (!latestResult) return;
                setMcLoading(true);
                try {
                  const res = await monteCarloApi.run({
                    scenario_config: latestResult.scenario_config,
                    monte_carlo: { runs: 200, study_variance: 0.15 },
                  });
                  setMcResult(res);
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : "Monte Carlo failed.");
                } finally {
                  setMcLoading(false);
                }
              }}
            >
              {mcLoading ? "Running 200 scenarios…" : "Run Monte Carlo Analysis"}
            </Button>
          </div>
        )}
      </Card>

      {/* Recommendation */}
      {summary.recommendation && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-300">
          <span className="font-semibold">Recommendation: </span>
          {summary.recommendation}
        </div>
      )}

      {/* Cross-simulation GPA trend */}
      {allResults.length >= 2 && (
        <Card title="GPA Across Scenarios" subtitle={`Predicted GPA mean across all ${allResults.length} simulations`}>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart
              data={allResults.map((r, i) => ({
                run: r.scenario_config.scenario_name ?? `#${r.id ?? i + 1}`,
                gpa: r.summary.predicted_gpa_mean,
              }))}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <XAxis dataKey="run" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={36} />
              <YAxis domain={[0, 4.0]} ticks={[0, 2.0, 3.0, 3.5, 4.0]} tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(v: number) => [v.toFixed(2), "GPA"]} />
              <ReferenceLine y={targetGpa} stroke="#10b981" strokeDasharray="4 3" label={{ value: "Target", position: "right", fontSize: 9, fill: "#10b981" }} />
              <Line type="monotone" dataKey="gpa" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: "#6366f1", stroke: "white", strokeWidth: 1.5 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
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
            <BurnoutRiskGauge probability={summary.burnout_probability} risk={summary.burnout_risk} />
          </div>
        </Card>
        <Card title="Weekly Time Allocation" subtitle="How your 168 hours are distributed">
          <TimeAllocationChart allocation={lastSnap.time_allocation} />
        </Card>
      </div>

      {/* Per-course grades */}
      <Card title="Per-Course Grade Trajectories" subtitle="Predicted grade % per course across the semester">
        <CourseGradesChart snapshots={weekly_snapshots} />
      </Card>
    </div>
  );
}
