"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const STORAGE_KEY = "adt_gpa_calc";

const GRADE_POINTS: Record<string, number> = {
  A: 4.0, "A-": 3.7,
  "B+": 3.3, B: 3.0, "B-": 2.7,
  "C+": 2.3, C: 2.0, "C-": 1.7,
  "D+": 1.3, D: 1.0,
  F: 0.0,
};

const GRADE_OPTIONS = Object.keys(GRADE_POINTS);

interface CourseRow {
  id: string;
  name: string;
  credits: string;
  grade: string;
}

function makeRow(): CourseRow {
  return { id: crypto.randomUUID(), name: "", credits: "3", grade: "A" };
}

function calcGpa(rows: CourseRow[]): number | null {
  let totalPoints = 0;
  let totalCredits = 0;
  for (const row of rows) {
    const cr = parseFloat(row.credits);
    const pts = GRADE_POINTS[row.grade];
    if (!isNaN(cr) && cr > 0 && pts !== undefined) {
      totalPoints += cr * pts;
      totalCredits += cr;
    }
  }
  if (totalCredits === 0) return null;
  return totalPoints / totalCredits;
}

function gpaColor(gpa: number): string {
  if (gpa >= 3.5) return "text-green-600 dark:text-green-400";
  if (gpa >= 2.5) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function neededGpa(
  currentGpa: number,
  currentCredits: number,
  semesterCredits: number,
  targetGpa: number
): number {
  // (currentGpa * currentCredits + needed * semesterCredits) / (currentCredits + semesterCredits) = targetGpa
  const needed =
    (targetGpa * (currentCredits + semesterCredits) - currentGpa * currentCredits) /
    semesterCredits;
  return needed;
}

export default function GpaCalcPage() {
  const [rows, setRows] = useState<CourseRow[]>([makeRow(), makeRow(), makeRow()]);
  const [existingGpa, setExistingGpa] = useState("");
  const [existingCredits, setExistingCredits] = useState("");
  const [targetGpa, setTargetGpa] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) setRows(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    }
  }, [rows]);

  function updateRow(id: string, field: keyof CourseRow, value: string) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const gpa = calcGpa(rows);
  const semesterCredits = rows.reduce((a, r) => {
    const cr = parseFloat(r.credits);
    return a + (!isNaN(cr) && cr > 0 ? cr : 0);
  }, 0);

  const existingGpaNum = parseFloat(existingGpa);
  const existingCreditsNum = parseFloat(existingCredits);
  const targetGpaNum = parseFloat(targetGpa);

  const showNeeded =
    !isNaN(existingGpaNum) &&
    !isNaN(existingCreditsNum) &&
    !isNaN(targetGpaNum) &&
    existingCreditsNum > 0 &&
    semesterCredits > 0 &&
    targetGpaNum > 0 &&
    targetGpaNum <= 4.0;

  const needed = showNeeded
    ? neededGpa(existingGpaNum, existingCreditsNum, semesterCredits, targetGpaNum)
    : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">GPA Calculator</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Calculate your semester GPA and find out what you need to hit your target.
        </p>
      </div>

      {/* Course rows */}
      <Card title="This Semester">
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-1 mb-1">
            <span className="col-span-5">Course Name</span>
            <span className="col-span-2 text-center">Credits</span>
            <span className="col-span-3 text-center">Grade</span>
            <span className="col-span-2"></span>
          </div>

          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
              <input
                type="text"
                value={row.name}
                onChange={(e) => updateRow(row.id, "name", e.target.value)}
                placeholder="Course name"
                className="col-span-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <input
                type="number"
                min={0.5}
                max={6}
                step={0.5}
                value={row.credits}
                onChange={(e) => updateRow(row.id, "credits", e.target.value)}
                className="col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-sm text-center text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <select
                value={row.grade}
                onChange={(e) => updateRow(row.id, "grade", e.target.value)}
                className="col-span-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g} ({GRADE_POINTS[g].toFixed(1)})</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                aria-label="Remove course"
                className="col-span-2 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
          ))}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRows((prev) => [...prev, makeRow()])}
            className="mt-2"
          >
            + Add Course
          </Button>
        </div>

        {/* Result */}
        {gpa !== null && (
          <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
              Semester GPA
            </p>
            <p className={`text-4xl font-bold ${gpaColor(gpa)}`}>
              {gpa.toFixed(2)}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {semesterCredits} credit{semesterCredits !== 1 ? "s" : ""} total
            </p>
          </div>
        )}
      </Card>

      {/* What you need section */}
      <Card title="What You Need">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Enter your existing GPA and credits to find out what this semester's GPA needs to be to hit your target.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Current Cumulative GPA
            </label>
            <input
              type="number"
              min={0}
              max={4}
              step={0.01}
              value={existingGpa}
              onChange={(e) => setExistingGpa(e.target.value)}
              placeholder="e.g. 3.20"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Credits Completed
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={existingCredits}
              onChange={(e) => setExistingCredits(e.target.value)}
              placeholder="e.g. 60"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Target GPA
            </label>
            <input
              type="number"
              min={0}
              max={4}
              step={0.01}
              value={targetGpa}
              onChange={(e) => setTargetGpa(e.target.value)}
              placeholder="e.g. 3.50"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {needed !== null && (
          <div className={[
            "rounded-xl border p-4 text-center",
            needed > 4.0
              ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
              : needed < 0
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
              : "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20",
          ].join(" ")}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
              Required This Semester
            </p>
            {needed > 4.0 ? (
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                Not achievable (needs {needed.toFixed(2)} &gt; 4.0)
              </p>
            ) : needed <= 0 ? (
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                Already on track! Any GPA this semester will do.
              </p>
            ) : (
              <p className={`text-4xl font-bold ${gpaColor(needed)}`}>
                {needed.toFixed(2)}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
