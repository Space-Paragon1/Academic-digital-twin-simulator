"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { simulationsApi, studentsApi } from "@/lib/api";
import type { SimulationResult, Student } from "@/lib/types";

const STUDENT_ID_KEY = "adt_student_id";

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ReportPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [simulations, setSimulations] = useState<SimulationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sid = typeof window !== "undefined"
      ? parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0")
      : 0;
    if (!sid) { setIsLoading(false); return; }
    Promise.all([studentsApi.get(sid), simulationsApi.history(sid)])
      .then(([s, sims]) => {
        setStudent(s);
        setSimulations(sims);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const bestSim = simulations.reduce<SimulationResult | null>((best, s) => {
    if (!best) return s;
    return s.summary.predicted_gpa_mean > best.summary.predicted_gpa_mean ? s : best;
  }, null);

  const latestSim = simulations.length > 0 ? simulations[simulations.length - 1] : null;

  const trendData = simulations.map((s, i) => ({
    run: s.scenario_config.scenario_name ?? `#${s.id ?? i + 1}`,
    gpa: s.summary.predicted_gpa_mean,
  }));

  const riskColor = (risk: string) => {
    if (risk === "HIGH") return "#ef4444";
    if (risk === "MEDIUM") return "#f59e0b";
    return "#22c55e";
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-500 text-sm">Loading report…</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12px; background: white; color: black; }
          .print-page { padding: 0; margin: 0; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-6 print-page">
        {/* Print button */}
        <div className="no-print flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Progress Report</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Printable academic simulation summary
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors shadow-sm"
          >
            Print / Save as PDF
          </button>
        </div>

        {/* Report header */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Academic Progress Report
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {student ? student.name : "Student"} · Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 dark:text-slate-500">Academic Digital Twin Simulator</p>
              {student && (
                <p className="text-xs text-slate-400 dark:text-slate-500">{student.email}</p>
              )}
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="text-center rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{simulations.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Total Simulations</p>
            </div>
            <div className="text-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-3">
              <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                {bestSim ? bestSim.summary.predicted_gpa_mean.toFixed(2) : "—"}
              </p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">Best GPA</p>
            </div>
            <div className="text-center rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {latestSim ? latestSim.summary.predicted_gpa_mean.toFixed(2) : "—"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Latest GPA</p>
            </div>
            <div className="text-center rounded-xl p-3" style={{ backgroundColor: latestSim ? riskColor(latestSim.summary.burnout_risk) + "20" : undefined }}>
              <p className="text-2xl font-bold" style={{ color: latestSim ? riskColor(latestSim.summary.burnout_risk) : "#64748b" }}>
                {latestSim ? latestSim.summary.burnout_risk : "—"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Current Burnout</p>
            </div>
          </div>
        </div>

        {/* GPA trend chart */}
        {trendData.length >= 2 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">GPA Trend Across Simulations</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 4, right: 16, left: 0, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="run"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={40}
                />
                <YAxis domain={[0, 4.0]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v: number) => [v.toFixed(2), "GPA"]}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
                <ReferenceLine
                  y={student?.target_gpa ?? 3.5}
                  stroke="#6366f1"
                  strokeDasharray="4 2"
                  label={{ value: "Target", position: "right", fontSize: 9, fill: "#6366f1" }}
                />
                <Line
                  type="monotone"
                  dataKey="gpa"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#6366f1", stroke: "white", strokeWidth: 1.5 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Simulation history table */}
        {simulations.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Simulation History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date</th>
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Scenario</th>
                    <th className="text-center py-2 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">GPA</th>
                    <th className="text-center py-2 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Burnout</th>
                    <th className="text-center py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  {[...simulations].reverse().map((s, i) => (
                    <tr key={s.id ?? i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <td className="py-2 pr-4 text-slate-500 dark:text-slate-400 text-xs">{formatDate(s.created_at)}</td>
                      <td className="py-2 pr-4 text-slate-800 dark:text-slate-200 font-medium">
                        {s.scenario_config.scenario_name ?? `Scenario #${s.id}`}
                        {s.id === bestSim?.id && (
                          <span className="ml-1.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded-full">Best</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-center font-semibold text-slate-900 dark:text-slate-100">
                        {s.summary.predicted_gpa_mean.toFixed(2)}
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <span
                          className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                          style={{
                            color: riskColor(s.summary.burnout_risk),
                            backgroundColor: riskColor(s.summary.burnout_risk) + "20",
                          }}
                        >
                          {s.summary.burnout_risk}
                        </span>
                      </td>
                      <td className="py-2 text-center text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {s.scenario_config.study_strategy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Best scenario highlight */}
        {bestSim && (
          <div className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 p-6">
            <h3 className="text-base font-semibold text-indigo-800 dark:text-indigo-300 mb-3">
              Best Scenario: {bestSim.scenario_config.scenario_name ?? `#${bestSim.id}`}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
              <div>
                <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                  {bestSim.summary.predicted_gpa_mean.toFixed(2)}
                </p>
                <p className="text-xs text-indigo-500 dark:text-indigo-400">Predicted GPA</p>
              </div>
              <div>
                <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                  {bestSim.summary.burnout_risk}
                </p>
                <p className="text-xs text-indigo-500 dark:text-indigo-400">Burnout Risk</p>
              </div>
              <div>
                <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                  {bestSim.scenario_config.sleep_target_hours}h
                </p>
                <p className="text-xs text-indigo-500 dark:text-indigo-400">Sleep Target</p>
              </div>
              <div>
                <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300 capitalize">
                  {bestSim.scenario_config.study_strategy}
                </p>
                <p className="text-xs text-indigo-500 dark:text-indigo-400">Study Strategy</p>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {bestSim?.summary.recommendation && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Recommendations</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {bestSim.summary.recommendation}
            </p>
          </div>
        )}

        {simulations.length === 0 && (
          <div className="flex h-48 items-center justify-center">
            <p className="text-slate-400 text-sm">No simulations yet. Run a scenario first to generate a report.</p>
          </div>
        )}
      </div>
    </>
  );
}
