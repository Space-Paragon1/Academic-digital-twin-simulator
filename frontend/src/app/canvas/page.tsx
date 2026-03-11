"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { canvasApi, coursesApi } from "@/lib/api";
import { useToast } from "@/components/ui/Toaster";
import type { CanvasCoursePreviewed, CourseCreate } from "@/lib/types";

const STUDENT_ID_KEY = "adt_student_id";
const DEFAULT_ASSESSMENT = { assignments: 0.3, midterm: 0.3, final: 0.4 };

type Step = 1 | 2 | 3;

interface EditableCourse extends CanvasCoursePreviewed {
  selected: boolean;
}

const STEP_LABELS: Record<Step, string> = {
  1: "Connect",
  2: "Preview",
  3: "Done",
};

export default function CanvasPage() {
  const [studentId, setStudentId] = useState<number>(0);
  const [step, setStep] = useState<Step>(1);
  const [canvasUrl, setCanvasUrl] = useState("");
  const [token, setToken] = useState("");
  const [courses, setCourses] = useState<EditableCourse[]>([]);
  const [importedCourses, setImportedCourses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    const sid = parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0");
    setStudentId(sid);
  }, []);

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) {
      setError("Set up your student profile first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const preview = await canvasApi.preview({
        student_id: studentId,
        canvas_url: canvasUrl.trim(),
        canvas_token: token.trim(),
      });
      setCourses(preview.courses.map((c) => ({ ...c, selected: true })));
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reach Canvas.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleImport() {
    const selected = courses.filter((c) => c.selected);
    if (!selected.length) return;
    setIsLoading(true);
    setError(null);
    const imported: string[] = [];
    for (const course of selected) {
      const payload: CourseCreate = {
        name: course.name,
        credits: course.credits,
        difficulty_score: course.difficulty_score,
        weekly_workload_hours: course.weekly_workload_hours,
        assessment_structure: DEFAULT_ASSESSMENT,
      };
      try {
        await coursesApi.add(studentId, payload);
        imported.push(course.name);
      } catch { /* skip duplicates */ }
    }
    setImportedCourses(imported);
    setStep(3);
    setIsLoading(false);
    toast.success(`${imported.length} course${imported.length !== 1 ? "s" : ""} imported successfully!`);
  }

  function updateCourse(canvasId: number, field: keyof EditableCourse, value: number | boolean) {
    setCourses((prev) =>
      prev.map((c) => (c.canvas_id === canvasId ? { ...c, [field]: value } : c))
    );
  }

  function toggleAll(checked: boolean) {
    setCourses((prev) => prev.map((c) => ({ ...c, selected: checked })));
  }

  function reset() {
    setStep(1);
    setCourses([]);
    setToken("");
    setError(null);
    setImportedCourses([]);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Canvas LMS Import</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Connect your Canvas account to import your enrolled courses automatically.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as Step[]).map((s, idx) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold transition-colors ${
              step === s
                ? "bg-brand-600 text-white"
                : step > s
                ? "bg-brand-200 dark:bg-brand-800 text-brand-700 dark:text-brand-300"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
            }`}>
              {step > s ? "✓" : s}
            </div>
            <span className={`text-sm font-medium hidden sm:inline ${
              step === s ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"
            }`}>
              {STEP_LABELS[s]}
            </span>
            {idx < 2 && (
              <div className={`h-px w-8 mx-1 ${step > s ? "bg-brand-400" : "bg-slate-200 dark:bg-slate-700"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Enter credentials */}
      {step === 1 && (
        <Card title="Step 1 — Enter Canvas Credentials">
          <form onSubmit={handleFetch} className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your API token is used only for this import request and is never stored.
            </p>

            <div>
              <label htmlFor="canvas-url" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Canvas Base URL
              </label>
              <input
                id="canvas-url"
                type="url"
                required
                placeholder="https://yourschool.instructure.com"
                value={canvasUrl}
                onChange={(e) => setCanvasUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label htmlFor="canvas-token" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Canvas Access Token
              </label>
              <input
                id="canvas-token"
                type="password"
                required
                placeholder="Paste your Canvas API token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                In Canvas: Account → Settings → Approved Integrations → New Access Token
              </p>
            </div>

            {!studentId && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                You need a student profile first.{" "}
                <a href="/profile" className="font-semibold underline">Create one here.</a>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" isLoading={isLoading} disabled={!studentId} className="w-full">
              Fetch My Courses
            </Button>
          </form>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === 2 && (
        <Card title={`Step 2 — Preview (${courses.length} course${courses.length !== 1 ? "s" : ""} found)`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Review and adjust course details before importing.
              </p>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={courses.every((c) => c.selected)}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="accent-brand-600"
                  aria-label="Select all courses"
                />
                Select all
              </label>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {courses.map((course) => (
                <div
                  key={course.canvas_id}
                  className={`rounded-xl border p-3 transition-colors ${
                    course.selected
                      ? "border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/10"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={course.selected}
                      onChange={(e) => updateCourse(course.canvas_id, "selected", e.target.checked)}
                      className="mt-0.5 accent-brand-600"
                      aria-label={`Select ${course.name}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {course.name}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{course.course_code}</p>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Credits</label>
                          <input
                            type="number"
                            min={1}
                            max={6}
                            value={course.credits}
                            onChange={(e) => updateCourse(course.canvas_id, "credits", parseInt(e.target.value) || 3)}
                            aria-label={`Credits for ${course.name}`}
                            className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Difficulty (1–10)</label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            step={0.5}
                            value={course.difficulty_score}
                            onChange={(e) => updateCourse(course.canvas_id, "difficulty_score", parseFloat(e.target.value) || 5)}
                            aria-label={`Difficulty score for ${course.name}`}
                            className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">h/wk</label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            step={0.5}
                            value={course.weekly_workload_hours}
                            onChange={(e) => updateCourse(course.canvas_id, "weekly_workload_hours", parseFloat(e.target.value) || 3)}
                            aria-label={`Weekly workload hours for ${course.name}`}
                            className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button
                size="sm"
                isLoading={isLoading}
                onClick={handleImport}
                disabled={!courses.some((c) => c.selected)}
                className="flex-1"
              >
                Import {courses.filter((c) => c.selected).length} Course
                {courses.filter((c) => c.selected).length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <Card title="Step 3 — Import Complete">
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="text-5xl">🎉</span>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {importedCourses.length} course{importedCourses.length !== 1 ? "s" : ""} imported!
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your courses are now in your profile. Run a scenario to simulate your semester.
              </p>
            </div>

            {importedCourses.length > 0 && (
              <ul className="space-y-1.5">
                {importedCourses.map((name) => (
                  <li
                    key={name}
                    className="flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-2 text-sm text-green-800 dark:text-green-300"
                  >
                    <span className="text-green-500 font-bold shrink-0">✓</span>
                    {name}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={reset} className="flex-1">
                Import More
              </Button>
              <a href="/scenarios" className="flex-1">
                <Button size="sm" className="w-full">Run a Scenario</Button>
              </a>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
