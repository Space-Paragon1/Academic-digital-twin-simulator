"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Course, ScenarioConfig } from "@/lib/types";

interface CourseDropSimulatorProps {
  courses: Course[];
  studentId: number;
  latestConfig: ScenarioConfig | null;
}

export function CourseDropSimulator({ courses, studentId, latestConfig }: CourseDropSimulatorProps) {
  const router = useRouter();
  const [included, setIncluded] = useState<Set<number>>(
    () => new Set(courses.map((c) => c.id))
  );

  const dropped = courses.filter((c) => !included.has(c.id));
  const droppedCredits = dropped.reduce((s, c) => s + c.credits, 0);
  const studyHoursSaved = droppedCredits * 2.5;
  const gpaImpact = Math.min(dropped.length * 0.05, 0.2);
  const burnoutReduction = Math.min(dropped.length * 5, 25);

  function toggle(id: number) {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runWithoutDropped() {
    const base: ScenarioConfig = latestConfig ?? {
      student_id: studentId,
      num_weeks: 15,
      work_hours_per_week: 0,
      sleep_target_hours: 7,
      study_strategy: "spaced",
      include_course_ids: courses.map((c) => c.id),
      exam_weeks: [8, 15],
    };
    const config: ScenarioConfig = {
      ...base,
      student_id: studentId,
      include_course_ids: Array.from(included),
      scenario_name: `Drop sim (${dropped.map((c) => c.name).join(", ")})`,
    };
    if (typeof window !== "undefined") {
      sessionStorage.setItem("adt_drop_config", JSON.stringify(config));
    }
    router.push("/scenarios");
  }

  if (courses.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Course Drop Simulator</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Toggle courses to estimate impact of dropping them.
        </p>
      </div>

      {/* Course list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {courses.map((c) => {
          const isIncluded = included.has(c.id);
          return (
            <label
              key={c.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer transition-colors ${
                isIncluded
                  ? "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
              }`}
            >
              <input
                type="checkbox"
                checked={isIncluded}
                onChange={() => toggle(c.id)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {c.credits} credits · difficulty {c.difficulty_score}/10
                </p>
              </div>
              {!isIncluded && (
                <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full shrink-0">
                  Dropped
                </span>
              )}
            </label>
          );
        })}
      </div>

      {/* Impact summary */}
      {dropped.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            Estimated Impact of Dropping {dropped.length} Course{dropped.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-white dark:bg-slate-800 border border-amber-100 dark:border-amber-800 p-2">
              <p className="text-base font-bold text-amber-700 dark:text-amber-300">-{droppedCredits}</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400">Credits</p>
            </div>
            <div className="rounded-lg bg-white dark:bg-slate-800 border border-amber-100 dark:border-amber-800 p-2">
              <p className="text-base font-bold text-amber-700 dark:text-amber-300">-{studyHoursSaved.toFixed(1)}h</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400">Study/wk saved</p>
            </div>
            <div className="rounded-lg bg-white dark:bg-slate-800 border border-green-100 dark:border-green-800 p-2">
              <p className="text-base font-bold text-green-600 dark:text-green-400">+{gpaImpact.toFixed(2)}</p>
              <p className="text-[10px] text-green-600 dark:text-green-400">Est. GPA boost</p>
            </div>
            <div className="rounded-lg bg-white dark:bg-slate-800 border border-green-100 dark:border-green-800 p-2">
              <p className="text-base font-bold text-green-600 dark:text-green-400">-{burnoutReduction}%</p>
              <p className="text-[10px] text-green-600 dark:text-green-400">Est. burnout</p>
            </div>
          </div>
          <p className="text-[10px] text-amber-600 dark:text-amber-500 italic">
            GPA and burnout estimates are rough heuristics — run a full simulation for accuracy.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={dropped.length === 0 || included.size === 0}
        onClick={runWithoutDropped}
        className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 transition-colors"
      >
        Run Full Simulation Without Dropped Courses
      </button>
    </div>
  );
}
