"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { simulationsApi, coursesApi } from "@/lib/api";
import type { SimulationResult, Course } from "@/lib/types";

const STUDENT_ID_KEY = "adt_student_id";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Palette of colors for each course
const COURSE_COLORS = [
  { bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-800 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-700" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-700" },
  { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-800 dark:text-amber-300", border: "border-amber-200 dark:border-amber-700" },
  { bg: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-800 dark:text-rose-300", border: "border-rose-200 dark:border-rose-700" },
  { bg: "bg-cyan-100 dark:bg-cyan-900/40", text: "text-cyan-800 dark:text-cyan-300", border: "border-cyan-200 dark:border-cyan-700" },
  { bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-800 dark:text-violet-300", border: "border-violet-200 dark:border-violet-700" },
  { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-800 dark:text-orange-300", border: "border-orange-200 dark:border-orange-700" },
];

interface StudyBlock {
  courseName: string;
  hours: number;
  colorIdx: number;
}

function buildSchedule(courses: Course[], totalHoursPerWeek: number): StudyBlock[][] {
  if (!courses.length || totalHoursPerWeek <= 0) return DAYS.map(() => []);

  // Compute weight for each course: difficulty * credits
  const weights = courses.map((c) => c.difficulty_score * c.credits);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Hours per course per week
  const hoursPerCourse = courses.map((c, i) =>
    totalWeight > 0 ? (weights[i] / totalWeight) * totalHoursPerWeek : totalHoursPerWeek / courses.length
  );

  // Distribute across days: heavier days Mon-Thu, lighter Fri-Sun
  const dayWeights = [1.2, 1.2, 1.2, 1.2, 0.8, 0.6, 0.4];
  const dayWeightSum = dayWeights.reduce((a, b) => a + b, 0);

  const schedule: StudyBlock[][] = DAYS.map(() => []);

  courses.forEach((course, cIdx) => {
    let remaining = hoursPerCourse[cIdx];
    const colorIdx = cIdx % COURSE_COLORS.length;

    dayWeights.forEach((dw, dIdx) => {
      if (remaining <= 0) return;
      const dayHours = Math.round(((dw / dayWeightSum) * hoursPerCourse[cIdx]) * 4) / 4; // round to 0.25h
      const actual = Math.min(dayHours, remaining);
      if (actual >= 0.25) {
        schedule[dIdx].push({ courseName: course.name, hours: actual, colorIdx });
        remaining -= actual;
      }
    });
  });

  return schedule;
}

export default function SchedulePage() {
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const studentId = parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0");
    if (!studentId) { setIsLoading(false); return; }

    Promise.all([
      simulationsApi.history(studentId),
      coursesApi.list(studentId),
    ])
      .then(([sims, courseList]) => {
        if (sims.length > 0) setSimulation(sims[sims.length - 1]);
        setCourses(courseList);
      })
      .catch(() => setError("Failed to load schedule data."))
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

  if (!simulation) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">No simulation found</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          Run a scenario first to generate your personalized study schedule.
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

  const totalHoursPerWeek = simulation.summary.required_study_hours_per_week;
  const schedule = buildSchedule(courses, totalHoursPerWeek);

  // Per-course totals for legend
  const courseTotals = courses.map((c, i) => {
    const dayHours = schedule.reduce((sum, day) => {
      const block = day.find((b) => b.courseName === c.name);
      return sum + (block?.hours ?? 0);
    }, 0);
    return { course: c, totalHours: dayHours, colorIdx: i % COURSE_COLORS.length };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Weekly Study Schedule</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Based on your latest simulation — {totalHoursPerWeek.toFixed(1)}h/week needed, distributed by course difficulty and credits.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Study</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalHoursPerWeek.toFixed(1)}h</p>
          <p className="text-xs text-slate-400 mt-0.5">per week</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Courses</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{courses.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">enrolled</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Daily Average</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{(totalHoursPerWeek / 7).toFixed(1)}h</p>
          <p className="text-xs text-slate-400 mt-0.5">per day</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Strategy</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 capitalize">{simulation.scenario_config.study_strategy}</p>
          <p className="text-xs text-slate-400 mt-0.5">study method</p>
        </Card>
      </div>

      {/* Course legend */}
      <Card title="Course Allocation">
        <div className="flex flex-wrap gap-3">
          {courseTotals.map(({ course, totalHours, colorIdx }) => {
            const color = COURSE_COLORS[colorIdx];
            return (
              <div
                key={course.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${color.bg} ${color.border}`}
              >
                <div>
                  <p className={`text-sm font-semibold leading-tight ${color.text}`}>{course.name}</p>
                  <p className={`text-xs leading-tight ${color.text} opacity-75`}>
                    {totalHours.toFixed(1)}h/wk · {course.credits} cr · difficulty {course.difficulty_score}/10
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Weekly grid */}
      <Card title="Weekly Grid" subtitle="Study blocks distributed across the week">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 pb-3 px-1"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="align-top">
                {schedule.map((dayBlocks, dIdx) => (
                  <td key={dIdx} className="px-1 pb-2">
                    <div className="space-y-1.5 min-h-[80px]">
                      {dayBlocks.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-2 text-center">
                          <span className="text-[10px] text-slate-400 dark:text-slate-600">Rest</span>
                        </div>
                      ) : (
                        dayBlocks.map((block, bIdx) => {
                          const color = COURSE_COLORS[block.colorIdx];
                          return (
                            <div
                              key={bIdx}
                              className={`rounded-lg border px-2 py-1.5 ${color.bg} ${color.border}`}
                            >
                              <p className={`text-[11px] font-semibold leading-tight truncate ${color.text}`}>
                                {block.courseName}
                              </p>
                              <p className={`text-[10px] leading-tight ${color.text} opacity-70`}>
                                {block.hours.toFixed(1)}h
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="sm:hidden space-y-4">
          {schedule.map((dayBlocks, dIdx) => (
            <div key={dIdx}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                {DAYS[dIdx]}
              </p>
              {dayBlocks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 px-3 py-2 text-center">
                  <span className="text-xs text-slate-400 dark:text-slate-600">Rest day</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {dayBlocks.map((block, bIdx) => {
                    const color = COURSE_COLORS[block.colorIdx];
                    return (
                      <div key={bIdx} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${color.bg} ${color.border}`}>
                        <span className={`text-sm font-medium ${color.text}`}>{block.courseName}</span>
                        <span className={`text-xs font-semibold ${color.text}`}>{block.hours.toFixed(1)}h</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Day-by-day totals */}
      <Card title="Daily Study Hours" subtitle="Hours per day this week">
        <div className="flex items-end gap-2 h-24">
          {schedule.map((dayBlocks, dIdx) => {
            const dayTotal = dayBlocks.reduce((s, b) => s + b.hours, 0);
            const maxTotal = Math.max(...schedule.map((d) => d.reduce((s, b) => s + b.hours, 0)), 1);
            const pct = (dayTotal / maxTotal) * 100;
            return (
              <div key={dIdx} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{dayTotal > 0 ? `${dayTotal.toFixed(1)}h` : ""}</span>
                <div className="w-full flex items-end justify-center" style={{ height: "56px" }}>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-indigo-500 transition-all"
                    style={{ height: `${Math.max(pct, dayTotal > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{DAY_SHORT[dIdx]}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
