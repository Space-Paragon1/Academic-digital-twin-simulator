"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BurnoutBadge } from "@/components/ui/Badge";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { simulationsApi, coursesApi } from "@/lib/api";
import { useToast } from "@/components/ui/Toaster";
import type { Course, SimulationResult, StudyStrategy, BurnoutRisk } from "@/lib/types";

const STUDENT_ID_KEY = "adt_student_id";
const PLANNER_KEY_PREFIX = "adt_planner_";
const MAX_SEMESTERS = 4;

const STRATEGY_OPTIONS: { value: StudyStrategy; label: string }[] = [
  { value: "spaced",   label: "Spaced"   },
  { value: "mixed",    label: "Mixed"    },
  { value: "cramming", label: "Cramming" },
];

interface SemesterEntry {
  id: string;
  name: string;
  num_weeks: number;
  target_gpa: number;
  work_hours: number;
  sleep_hours: number;
  study_strategy: StudyStrategy;
}

interface SemesterResult {
  semId: string;
  result: SimulationResult | null;
  error: string | null;
}

function defaultSemester(index: number): SemesterEntry {
  return {
    id: `sem-${Date.now()}-${index}`,
    name: `Semester ${index + 1}`,
    num_weeks: 16,
    target_gpa: 3.5,
    work_hours: 15,
    sleep_hours: 7,
    study_strategy: "spaced",
  };
}

function TrendArrow({ prev, curr }: { prev: number; curr: number }) {
  const diff = curr - prev;
  if (Math.abs(diff) < 0.01) return <span className="text-slate-400 mx-1">→</span>;
  if (diff > 0) return <span className="text-green-500 mx-1 font-bold">↑</span>;
  return <span className="text-red-500 mx-1 font-bold">↓</span>;
}

export default function PlannerPage() {
  const [studentId, setStudentId] = useState<number>(0);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<SemesterEntry[]>([defaultSemester(0)]);
  const [results, setResults] = useState<SemesterResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const toast = useToast();

  const persistPlanner = useCallback((sid: number, entries: SemesterEntry[]) => {
    localStorage.setItem(`${PLANNER_KEY_PREFIX}${sid}`, JSON.stringify(entries));
  }, []);

  useEffect(() => {
    const sid = parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0");
    if (!sid) { setPageLoading(false); return; }
    setStudentId(sid);

    const saved = localStorage.getItem(`${PLANNER_KEY_PREFIX}${sid}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SemesterEntry[];
        if (Array.isArray(parsed) && parsed.length > 0) setSemesters(parsed);
      } catch { /* ignore */ }
    }

    coursesApi.list(sid)
      .then(setCourses)
      .catch(() => {})
      .finally(() => setPageLoading(false));
  }, []);

  function updateSemester(id: string, field: keyof SemesterEntry, value: string | number) {
    setSemesters((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, [field]: value } : s));
      persistPlanner(studentId, next);
      return next;
    });
  }

  function addSemester() {
    if (semesters.length >= MAX_SEMESTERS) return;
    setSemesters((prev) => {
      const next = [...prev, defaultSemester(prev.length)];
      persistPlanner(studentId, next);
      return next;
    });
  }

  function removeSemester(id: string) {
    setSemesters((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistPlanner(studentId, next);
      return next;
    });
  }

  async function handleRunAll() {
    if (!studentId || courses.length === 0) {
      toast.error("Add courses to your profile first.");
      return;
    }
    setIsRunning(true);
    setResults([]);
    const newResults: SemesterResult[] = [];

    for (const sem of semesters) {
      try {
        const result = await simulationsApi.run({
          student_id: studentId,
          num_weeks: sem.num_weeks,
          work_hours_per_week: sem.work_hours,
          sleep_target_hours: sem.sleep_hours,
          study_strategy: sem.study_strategy,
          include_course_ids: courses.map((c) => c.id),
          scenario_name: sem.name,
          exam_weeks: [Math.floor(sem.num_weeks / 2), sem.num_weeks],
        });
        newResults.push({ semId: sem.id, result, error: null });
      } catch (err: unknown) {
        newResults.push({
          semId: sem.id,
          result: null,
          error: err instanceof Error ? err.message : "Simulation failed.",
        });
      }
    }

    setResults(newResults);
    setIsRunning(false);
    toast.success("All semesters simulated!");
  }

  if (pageLoading) return <PageSkeleton />;

  if (!studentId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">Set up your profile first</p>
        <a
          href="/profile"
          className="rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Go to Profile
        </a>
      </div>
    );
  }

  const completedResults = results.filter((r) => r.result !== null);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Multi-Semester Planner</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Plan up to {MAX_SEMESTERS} semesters and simulate them all at once.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {semesters.length < MAX_SEMESTERS && (
            <Button variant="secondary" size="sm" onClick={addSemester}>
              + Add Semester
            </Button>
          )}
          <Button
            size="sm"
            isLoading={isRunning}
            onClick={handleRunAll}
            disabled={courses.length === 0}
          >
            {isRunning ? "Simulating…" : "Run All"}
          </Button>
        </div>
      </div>

      {courses.length === 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          No courses found. <a href="/profile" className="font-semibold underline">Add courses</a> to your profile before running the planner.
        </div>
      )}

      {/* Semester cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {semesters.map((sem, idx) => (
          <Card key={sem.id} padding="sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                Semester {idx + 1}
              </span>
              {semesters.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSemester(sem.id)}
                  aria-label={`Remove ${sem.name}`}
                  className="text-slate-400 hover:text-red-500 text-lg leading-none transition-colors"
                >
                  ×
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              <div>
                <label htmlFor={`sem-name-${sem.id}`} className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Name</label>
                <input
                  id={`sem-name-${sem.id}`}
                  type="text"
                  value={sem.name}
                  onChange={(e) => updateSemester(sem.id, "name", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor={`sem-weeks-${sem.id}`} className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Weeks</label>
                  <input
                    id={`sem-weeks-${sem.id}`}
                    type="number"
                    min={8}
                    max={20}
                    value={sem.num_weeks}
                    onChange={(e) => updateSemester(sem.id, "num_weeks", parseInt(e.target.value) || 16)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label htmlFor={`sem-work-${sem.id}`} className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Work h/wk</label>
                  <input
                    id={`sem-work-${sem.id}`}
                    type="number"
                    min={0}
                    max={40}
                    value={sem.work_hours}
                    onChange={(e) => updateSemester(sem.id, "work_hours", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label htmlFor={`sem-sleep-${sem.id}`} className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Sleep h/night</label>
                  <input
                    id={`sem-sleep-${sem.id}`}
                    type="number"
                    min={4}
                    max={12}
                    step={0.5}
                    value={sem.sleep_hours}
                    onChange={(e) => updateSemester(sem.id, "sleep_hours", parseFloat(e.target.value) || 7)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label htmlFor={`sem-strategy-${sem.id}`} className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Strategy</label>
                  <select
                    id={`sem-strategy-${sem.id}`}
                    value={sem.study_strategy}
                    onChange={(e) => updateSemester(sem.id, "study_strategy", e.target.value as StudyStrategy)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {STRATEGY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Results table */}
      {results.length > 0 && (
        <Card title="Simulation Results" subtitle="Predicted outcomes across all planned semesters">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Semester</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Predicted GPA</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Burnout Risk</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sleep Deficit</th>
                  <th className="text-center py-2 pl-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, idx) => {
                  const sem = semesters.find((s) => s.id === r.semId);
                  const prevResult = idx > 0 ? results[idx - 1].result : null;
                  return (
                    <tr key={r.semId} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-200">
                        {sem?.name ?? `Semester ${idx + 1}`}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {r.result ? (
                          <span className="flex items-center justify-center font-bold text-slate-900 dark:text-slate-100">
                            {prevResult && (
                              <TrendArrow
                                prev={prevResult.summary.predicted_gpa_mean}
                                curr={r.result.summary.predicted_gpa_mean}
                              />
                            )}
                            {r.result.summary.predicted_gpa_mean.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-red-500 text-xs">{r.error ?? "—"}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {r.result ? <BurnoutBadge risk={r.result.summary.burnout_risk as BurnoutRisk} /> : "—"}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">
                        {r.result ? `${r.result.summary.sleep_deficit_hours.toFixed(1)}h/wk` : "—"}
                      </td>
                      <td className="py-3 pl-3 text-center">
                        {r.result ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2 py-0.5">
                            Done
                          </span>
                        ) : r.error ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold px-2 py-0.5">
                            Error
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold px-2 py-0.5">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary trend bar */}
          {completedResults.length >= 2 && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                Overall GPA Trend
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {completedResults.map((r, idx) => {
                  const sem = semesters.find((s) => s.id === r.semId);
                  const gpa = r.result!.summary.predicted_gpa_mean;
                  const prev = idx > 0 ? completedResults[idx - 1].result!.summary.predicted_gpa_mean : null;
                  return (
                    <div key={r.semId} className="flex items-center gap-1">
                      {idx > 0 && prev !== null && (
                        <TrendArrow prev={prev} curr={gpa} />
                      )}
                      <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 text-center">
                        <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">{sem?.name}</p>
                        <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{gpa.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
