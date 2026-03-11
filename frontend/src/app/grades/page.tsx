"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { simulationsApi, coursesApi, actualGradesApi } from "@/lib/api";
import { useToast } from "@/components/ui/Toaster";
import type { SimulationResult, Course, ActualGradeEntry } from "@/lib/types";

const STUDENT_ID_KEY = "adt_student_id";

// Convert a percentage grade to a GPA point (simple 4.0 scale)
function pctToGpa(pct: number): number {
  if (pct >= 93) return 4.0;
  if (pct >= 90) return 3.7;
  if (pct >= 87) return 3.3;
  if (pct >= 83) return 3.0;
  if (pct >= 80) return 2.7;
  if (pct >= 77) return 2.3;
  if (pct >= 73) return 2.0;
  if (pct >= 70) return 1.7;
  if (pct >= 67) return 1.3;
  if (pct >= 63) return 1.0;
  if (pct >= 60) return 0.7;
  return 0.0;
}

interface SimGradeState {
  simId: number;
  simLabel: string;
  predictedGpa: number;
  courseInputs: Record<string, string>; // course_name -> pct string
  savedGrades: ActualGradeEntry[];
  isSaving: boolean;
  isLoading: boolean;
}

export default function GradesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [simStates, setSimStates] = useState<SimGradeState[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const loadGradesForSim = useCallback(async (simId: number) => {
    try {
      const res = await actualGradesApi.get(simId);
      setSimStates((prev) =>
        prev.map((s) =>
          s.simId === simId
            ? {
                ...s,
                savedGrades: res.grades,
                courseInputs: Object.fromEntries(
                  res.grades.map((g) => [g.course_name, String(g.actual_grade)])
                ),
                isLoading: false,
              }
            : s
        )
      );
    } catch {
      setSimStates((prev) =>
        prev.map((s) => (s.simId === simId ? { ...s, isLoading: false } : s))
      );
    }
  }, []);

  useEffect(() => {
    const studentId = parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0");
    if (!studentId) {
      setPageLoading(false);
      return;
    }

    Promise.all([simulationsApi.history(studentId), coursesApi.list(studentId)])
      .then(([sims, courseList]) => {
        setCourses(courseList);
        const states: SimGradeState[] = sims.map((sim: SimulationResult) => ({
          simId: sim.id!,
          simLabel:
            sim.scenario_config.scenario_name ??
            `Scenario #${sim.id} (${sim.scenario_config.num_weeks}wk)`,
          predictedGpa: sim.summary.predicted_gpa_mean,
          courseInputs: {},
          savedGrades: [],
          isSaving: false,
          isLoading: true,
        }));
        setSimStates(states);
        states.forEach((s) => loadGradesForSim(s.simId));
      })
      .catch(() => setError("Failed to load data."))
      .finally(() => setPageLoading(false));
  }, [loadGradesForSim]);

  function handleInputChange(simId: number, courseName: string, value: string) {
    setSimStates((prev) =>
      prev.map((s) =>
        s.simId === simId
          ? { ...s, courseInputs: { ...s.courseInputs, [courseName]: value } }
          : s
      )
    );
  }

  async function handleSave(simId: number) {
    const state = simStates.find((s) => s.simId === simId);
    if (!state) return;

    const grades: ActualGradeEntry[] = Object.entries(state.courseInputs)
      .filter(([, v]) => v !== "" && !isNaN(parseFloat(v)))
      .map(([course_name, v]) => ({
        course_name,
        week: 1,
        actual_grade: Math.min(100, Math.max(0, parseFloat(v))),
      }));

    if (grades.length === 0) {
      toast.error("Enter at least one grade before saving.");
      return;
    }

    setSimStates((prev) =>
      prev.map((s) => (s.simId === simId ? { ...s, isSaving: true } : s))
    );

    try {
      const res = await actualGradesApi.save(simId, grades);
      setSimStates((prev) =>
        prev.map((s) =>
          s.simId === simId ? { ...s, savedGrades: res.grades, isSaving: false } : s
        )
      );
      toast.success(`Saved ${res.saved} grade${res.saved !== 1 ? "s" : ""}.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save grades.");
      setSimStates((prev) =>
        prev.map((s) => (s.simId === simId ? { ...s, isSaving: false } : s))
      );
    }
  }

  if (pageLoading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (simStates.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">No simulations yet</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          Run a scenario first, then come back here to enter your actual grades.
        </p>
        <a
          href="/scenarios"
          className="rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Run a Scenario
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Actual Grades</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Enter your real grades per course and compare them against your predicted GPA.
        </p>
      </div>

      {simStates.map((state) => {
        // Compute actual GPA from saved grades weighted by course credits
        let actualGpa: number | null = null;
        if (state.savedGrades.length > 0) {
          let totalCredits = 0;
          let weightedSum = 0;
          state.savedGrades.forEach((g) => {
            const course = courses.find((c) => c.name === g.course_name);
            const credits = course?.credits ?? 3;
            weightedSum += pctToGpa(g.actual_grade) * credits;
            totalCredits += credits;
          });
          if (totalCredits > 0) actualGpa = weightedSum / totalCredits;
        }

        const gpaDiff = actualGpa !== null ? actualGpa - state.predictedGpa : null;

        return (
          <Card key={state.simId} title={state.simLabel}>
            {state.isLoading ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">Loading grades…</p>
            ) : (
              <div className="space-y-4">
                {/* Summary row */}
                <div className="flex flex-wrap gap-4">
                  <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2.5 text-center min-w-[110px]">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-400">Predicted GPA</p>
                    <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">{state.predictedGpa.toFixed(2)}</p>
                  </div>
                  {actualGpa !== null && (
                    <>
                      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 text-center min-w-[110px]">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500 dark:text-emerald-400">Actual GPA</p>
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{actualGpa.toFixed(2)}</p>
                      </div>
                      {gpaDiff !== null && (
                        <div className={`rounded-xl border px-4 py-2.5 text-center min-w-[110px] ${
                          gpaDiff >= 0
                            ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                            : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                        }`}>
                          <p className={`text-[10px] font-semibold uppercase tracking-wide ${
                            gpaDiff >= 0 ? "text-green-500 dark:text-green-400" : "text-red-500 dark:text-red-400"
                          }`}>Difference</p>
                          <p className={`text-xl font-bold mt-0.5 ${
                            gpaDiff >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                          }`}>
                            {gpaDiff >= 0 ? "+" : ""}{gpaDiff.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Grades table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Course
                        </th>
                        <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Credits
                        </th>
                        <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Predicted Contribution
                        </th>
                        <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Actual Grade %
                        </th>
                        <th className="text-center py-2 pl-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          GPA Points
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course) => {
                        const rawVal = state.courseInputs[course.name] ?? "";
                        const pctNum = parseFloat(rawVal);
                        const gpaPoints = !isNaN(pctNum) && rawVal !== "" ? pctToGpa(pctNum) : null;
                        const saved = state.savedGrades.find((g) => g.course_name === course.name);
                        return (
                          <tr
                            key={course.id}
                            className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                          >
                            <td className="py-2.5 pr-4 font-medium text-slate-800 dark:text-slate-200">
                              {course.name}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-500 dark:text-slate-400">
                              {course.credits}
                            </td>
                            <td className="py-2.5 px-3 text-center text-indigo-600 dark:text-indigo-400 font-semibold">
                              {(state.predictedGpa * course.credits).toFixed(2)} pts
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <label htmlFor={`grade-${state.simId}-${course.id}`} className="sr-only">
                                Actual grade percentage for {course.name}
                              </label>
                              <input
                                id={`grade-${state.simId}-${course.id}`}
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                placeholder={saved ? String(saved.actual_grade) : "0–100"}
                                value={rawVal}
                                onChange={(e) =>
                                  handleInputChange(state.simId, course.name, e.target.value)
                                }
                                className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-center text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              />
                            </td>
                            <td className="py-2.5 pl-3 text-center">
                              {gpaPoints !== null ? (
                                <span className={`font-semibold text-sm ${
                                  gpaPoints >= 3.0
                                    ? "text-green-600 dark:text-green-400"
                                    : gpaPoints >= 2.0
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}>
                                  {gpaPoints.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Button
                  size="sm"
                  isLoading={state.isSaving}
                  onClick={() => handleSave(state.simId)}
                >
                  Save Grades
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
