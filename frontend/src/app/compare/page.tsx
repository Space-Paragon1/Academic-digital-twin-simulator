"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BurnoutBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { simulationsApi } from "@/lib/api";
import type { SimulationResult } from "@/lib/types";

const STUDENT_ID_KEY = "adt_student_id";

const COLORS = { a: "#6366f1", b: "#f59e0b" } as const;

const SLOT_LABEL_CLASS = {
  indigo: "block text-xs font-semibold uppercase tracking-wide mb-1 text-indigo-600",
  amber: "block text-xs font-semibold uppercase tracking-wide mb-1 text-amber-600",
} as const;

const RECOMMENDATION_CLASS = {
  indigo: "rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800",
  amber: "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800",
} as const;

function scenarioLabel(sim: SimulationResult): string {
  return sim.scenario_config.scenario_name ?? `Scenario #${sim.id}`;
}

interface ComparisonStatProps {
  label: string;
  valueA: string;
  valueB: string;
  highlight?: "a" | "b" | "none";
}

function ComparisonRow({ label, valueA, valueB, highlight = "none" }: ComparisonStatProps) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pr-3 text-xs text-gray-500 font-medium uppercase tracking-wide whitespace-nowrap">
        {label}
      </td>
      <td className={`py-2 px-3 text-center text-sm font-semibold ${highlight === "a" ? "text-indigo-700" : "text-gray-800"}`}>
        {valueA}
      </td>
      <td className={`py-2 px-3 text-center text-sm font-semibold ${highlight === "b" ? "text-amber-600" : "text-gray-800"}`}>
        {valueB}
      </td>
    </tr>
  );
}

export default function ComparePage() {
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [idA, setIdA] = useState<number | "">("");
  const [idB, setIdB] = useState<number | "">("");

  useEffect(() => {
    const studentId = parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0");
    if (!studentId) { setIsLoading(false); return; }
    simulationsApi
      .history(studentId)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const simA = history.find((s) => s.id === idA) ?? null;
  const simB = history.find((s) => s.id === idB) ?? null;

  // Build per-week rows merging both scenarios for overlaid charts
  const chartData = (() => {
    if (!simA || !simB) return [];
    const maxWeeks = Math.max(
      simA.weekly_snapshots.length,
      simB.weekly_snapshots.length,
    );
    return Array.from({ length: maxWeeks }, (_, i) => ({
      week: i + 1,
      gpaA: simA.weekly_snapshots[i]?.predicted_gpa ?? null,
      gpaB: simB.weekly_snapshots[i]?.predicted_gpa ?? null,
      loadA: simA.weekly_snapshots[i]?.cognitive_load ?? null,
      loadB: simB.weekly_snapshots[i]?.cognitive_load ?? null,
      burnoutA: simA.weekly_snapshots[i]
        ? +(simA.weekly_snapshots[i].burnout_probability * 100).toFixed(1)
        : null,
      burnoutB: simB.weekly_snapshots[i]
        ? +(simB.weekly_snapshots[i].burnout_probability * 100).toFixed(1)
        : null,
    }));
  })();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <p className="text-gray-500">No simulations to compare yet.</p>
        <Link href="/scenarios"><Button>Run a Scenario First</Button></Link>
      </div>
    );
  }

  const labelA = simA ? scenarioLabel(simA) : "—";
  const labelB = simB ? scenarioLabel(simB) : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compare Scenarios</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Select two simulations to see a side-by-side analysis.
        </p>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(["A", "B"] as const).map((slot) => {
          const selectedId = slot === "A" ? idA : idB;
          const otherId = slot === "A" ? idB : idA;
          const setter = slot === "A" ? setIdA : setIdB;
          const color = slot === "A" ? "indigo" : "amber";
          return (
            <div key={slot}>
              <label className={SLOT_LABEL_CLASS[color]}>
                Scenario {slot}
              </label>
              <select
                value={selectedId}
                onChange={(e) => setter(e.target.value === "" ? "" : parseInt(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">— Select a scenario —</option>
                {history.map((sim) => (
                  <option
                    key={sim.id}
                    value={sim.id}
                    disabled={sim.id === otherId}
                  >
                    {scenarioLabel(sim)} · GPA {sim.summary.predicted_gpa_mean.toFixed(2)} · {sim.summary.burnout_risk}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {/* Comparison content */}
      {simA && simB ? (
        <>
          {/* Summary comparison table */}
          <Card title="Summary Comparison">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-3 text-xs text-gray-400 font-normal"></th>
                    <th className="text-center py-2 px-3 text-sm font-semibold" style={{ color: COLORS.a }}>
                      {labelA}
                    </th>
                    <th className="text-center py-2 px-3 text-sm font-semibold" style={{ color: COLORS.b }}>
                      {labelB}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <ComparisonRow
                    label="Predicted GPA"
                    valueA={simA.summary.predicted_gpa_mean.toFixed(2)}
                    valueB={simB.summary.predicted_gpa_mean.toFixed(2)}
                    highlight={
                      simA.summary.predicted_gpa_mean > simB.summary.predicted_gpa_mean
                        ? "a"
                        : simB.summary.predicted_gpa_mean > simA.summary.predicted_gpa_mean
                        ? "b"
                        : "none"
                    }
                  />
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Burnout Risk</td>
                    <td className="py-2 px-3 text-center"><BurnoutBadge risk={simA.summary.burnout_risk} /></td>
                    <td className="py-2 px-3 text-center"><BurnoutBadge risk={simB.summary.burnout_risk} /></td>
                  </tr>
                  <ComparisonRow
                    label="Burnout Prob."
                    valueA={`${(simA.summary.burnout_probability * 100).toFixed(0)}%`}
                    valueB={`${(simB.summary.burnout_probability * 100).toFixed(0)}%`}
                    highlight={
                      simA.summary.burnout_probability < simB.summary.burnout_probability
                        ? "a"
                        : simB.summary.burnout_probability < simA.summary.burnout_probability
                        ? "b"
                        : "none"
                    }
                  />
                  <ComparisonRow
                    label="Sleep Deficit"
                    valueA={`${simA.summary.sleep_deficit_hours.toFixed(1)}h/wk`}
                    valueB={`${simB.summary.sleep_deficit_hours.toFixed(1)}h/wk`}
                    highlight={
                      simA.summary.sleep_deficit_hours < simB.summary.sleep_deficit_hours
                        ? "a"
                        : simB.summary.sleep_deficit_hours < simA.summary.sleep_deficit_hours
                        ? "b"
                        : "none"
                    }
                  />
                  <ComparisonRow
                    label="Overload Weeks"
                    valueA={String(simA.summary.peak_overload_weeks.length)}
                    valueB={String(simB.summary.peak_overload_weeks.length)}
                    highlight={
                      simA.summary.peak_overload_weeks.length < simB.summary.peak_overload_weeks.length
                        ? "a"
                        : simB.summary.peak_overload_weeks.length < simA.summary.peak_overload_weeks.length
                        ? "b"
                        : "none"
                    }
                  />
                  <ComparisonRow
                    label="Work Hrs/Wk"
                    valueA={`${simA.scenario_config.work_hours_per_week}h`}
                    valueB={`${simB.scenario_config.work_hours_per_week}h`}
                  />
                  <ComparisonRow
                    label="Sleep Target"
                    valueA={`${simA.scenario_config.sleep_target_hours}h/night`}
                    valueB={`${simB.scenario_config.sleep_target_hours}h/night`}
                  />
                  <ComparisonRow
                    label="Study Strategy"
                    valueA={simA.scenario_config.study_strategy}
                    valueB={simB.scenario_config.study_strategy}
                  />
                  <ComparisonRow
                    label="Weeks"
                    valueA={`${simA.scenario_config.num_weeks}`}
                    valueB={`${simB.scenario_config.num_weeks}`}
                  />
                </tbody>
              </table>
            </div>
          </Card>

          {/* GPA trajectory comparison */}
          <Card title="GPA Trajectory" subtitle="Predicted GPA per week">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} label={{ value: "Week", position: "insideBottomRight", offset: -4, fontSize: 11 }} />
                <YAxis domain={[0, 4]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => v?.toFixed(2)} labelFormatter={(w) => `Week ${w}`} />
                <Legend />
                <ReferenceLine y={3.5} stroke="#94a3b8" strokeDasharray="4 2" label={{ value: "3.5", fontSize: 10, fill: "#94a3b8" }} />
                <Line type="monotone" dataKey="gpaA" name={labelA} stroke={COLORS.a} dot={false} strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="gpaB" name={labelB} stroke={COLORS.b} dot={false} strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Cognitive load comparison */}
          <Card title="Cognitive Load" subtitle="Weekly load score (0–100)">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} label={{ value: "Week", position: "insideBottomRight", offset: -4, fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => v?.toFixed(0)} labelFormatter={(w) => `Week ${w}`} />
                <Legend />
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "Overload", fontSize: 10, fill: "#ef4444" }} />
                <Line type="monotone" dataKey="loadA" name={labelA} stroke={COLORS.a} dot={false} strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="loadB" name={labelB} stroke={COLORS.b} dot={false} strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Burnout probability comparison */}
          <Card title="Burnout Probability" subtitle="Cumulative burnout risk over semester (%)">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} label={{ value: "Week", position: "insideBottomRight", offset: -4, fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: number) => `${v?.toFixed(1)}%`} labelFormatter={(w) => `Week ${w}`} />
                <Legend />
                <ReferenceLine y={60} stroke="#f97316" strokeDasharray="4 2" label={{ value: "High", fontSize: 10, fill: "#f97316" }} />
                <Line type="monotone" dataKey="burnoutA" name={labelA} stroke={COLORS.a} dot={false} strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="burnoutB" name={labelB} stroke={COLORS.b} dot={false} strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Per-course grade comparison */}
          {(() => {
            const lastA = simA.weekly_snapshots[simA.weekly_snapshots.length - 1];
            const lastB = simB.weekly_snapshots[simB.weekly_snapshots.length - 1];
            const coursesA = lastA?.course_grades ?? {};
            const coursesB = lastB?.course_grades ?? {};
            const allCourses = Array.from(
              new Set([...Object.keys(coursesA), ...Object.keys(coursesB)])
            ).sort();
            if (!allCourses.length) return null;

            function letterGrade(pct: number | undefined): string {
              if (pct === undefined) return "—";
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

            return (
              <Card title="Per-Course Grade Comparison" subtitle="Final predicted grade (last simulated week)">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 pr-3 text-xs text-gray-400 font-normal">Course</th>
                        <th className="text-center py-2 px-3 text-sm font-semibold text-indigo-500">
                          {labelA}
                        </th>
                        <th className="text-center py-2 px-3 text-sm font-semibold text-amber-500">
                          {labelB}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allCourses.map((course) => {
                        const gA = coursesA[course];
                        const gB = coursesB[course];
                        const higherA = gA !== undefined && gB !== undefined && gA > gB;
                        const higherB = gA !== undefined && gB !== undefined && gB > gA;
                        return (
                          <tr key={course} className="border-b border-gray-100 last:border-0">
                            <td className="py-2 pr-3 text-xs text-gray-600 font-medium">{course}</td>
                            <td className={`py-2 px-3 text-center text-sm font-semibold ${higherA ? "text-indigo-700" : "text-gray-700"}`}>
                              {gA !== undefined ? `${gA.toFixed(1)}% (${letterGrade(gA)})` : "—"}
                            </td>
                            <td className={`py-2 px-3 text-center text-sm font-semibold ${higherB ? "text-amber-600" : "text-gray-700"}`}>
                              {gB !== undefined ? `${gB.toFixed(1)}% (${letterGrade(gB)})` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })()}

          {/* Recommendations */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[{ sim: simA, label: labelA, color: "indigo" }, { sim: simB, label: labelB, color: "amber" }].map(
              ({ sim, label, color }) =>
                sim.summary.recommendation ? (
                  <div key={label} className={RECOMMENDATION_CLASS[color]}>
                    <p className="font-semibold mb-1">{label}</p>
                    {sim.summary.recommendation}
                  </div>
                ) : null,
            )}
          </div>
        </>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center text-sm text-gray-400">
          Select two scenarios above to see the comparison.
        </div>
      )}
    </div>
  );
}
