"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { canvasApi, coursesApi } from "@/lib/api";
import type { CanvasCoursePreviewed, CourseCreate } from "@/lib/types";

interface CanvasImportProps {
  studentId: number;
  onImported: () => void; // refresh course list after import
}

type Step = "form" | "preview" | "done";

interface EditableCourse extends CanvasCoursePreviewed {
  selected: boolean;
}

const DEFAULT_ASSESSMENT = { assignments: 0.3, midterm: 0.3, final: 0.4 };

export function CanvasImport({ studentId, onImported }: CanvasImportProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [canvasUrl, setCanvasUrl] = useState("");
  const [token, setToken] = useState("");
  const [courses, setCourses] = useState<EditableCourse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const preview = await canvasApi.preview({
        student_id: studentId,
        canvas_url: canvasUrl.trim(),
        canvas_token: token.trim(),
      });
      setCourses(preview.courses.map((c) => ({ ...c, selected: true })));
      setStep("preview");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reach Canvas.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    const selected = courses.filter((c) => c.selected);
    if (!selected.length) return;
    setIsLoading(true);
    setError(null);
    let imported = 0;
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
        imported++;
      } catch {
        // skip duplicates or failed courses silently
      }
    }
    setImportCount(imported);
    setStep("done");
    setIsLoading(false);
    onImported();
  };

  const updateCourse = (
    canvasId: number,
    field: keyof EditableCourse,
    value: number | boolean,
  ) => {
    setCourses((prev) =>
      prev.map((c) => (c.canvas_id === canvasId ? { ...c, [field]: value } : c)),
    );
  };

  const toggleAll = (checked: boolean) =>
    setCourses((prev) => prev.map((c) => ({ ...c, selected: checked })));

  const handleClose = () => {
    setOpen(false);
    setStep("form");
    setToken("");
    setError(null);
    setCourses([]);
  };

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Import from Canvas
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand-900">Canvas LMS Import</h3>
        <button
          type="button"
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close Canvas import"
        >
          ×
        </button>
      </div>

      {/* ── Step 1: credentials form ── */}
      {step === "form" && (
        <form onSubmit={handleFetch} className="space-y-4">
          <p className="text-xs text-gray-500">
            Your token is used only for this request and is never stored.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Canvas URL
            </label>
            <input
              type="url"
              required
              placeholder="https://yourschool.instructure.com"
              value={canvasUrl}
              onChange={(e) => setCanvasUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Canvas Access Token
            </label>
            <input
              type="password"
              required
              placeholder="Paste your Canvas API token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Canvas → Account → Settings → New Access Token
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-600 rounded border border-red-200 bg-red-50 px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" isLoading={isLoading} className="w-full">
            Fetch My Courses
          </Button>
        </form>
      )}

      {/* ── Step 2: review and edit ── */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              Found <span className="font-semibold">{courses.length}</span> active courses.
              Adjust credits and difficulty, then import.
            </p>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={courses.every((c) => c.selected)}
                onChange={(e) => toggleAll(e.target.checked)}
                className="accent-brand-600"
              />
              All
            </label>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {courses.map((course) => (
              <div
                key={course.canvas_id}
                className={`rounded-lg border p-3 transition-colors ${
                  course.selected ? "border-brand-300 bg-white" : "border-gray-200 bg-gray-50 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={course.selected}
                    onChange={(e) =>
                      updateCourse(course.canvas_id, "selected", e.target.checked)
                    }
                    className="mt-0.5 accent-brand-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {course.name}
                    </p>
                    <p className="text-xs text-gray-400">{course.course_code}</p>

                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">
                          Credits
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={6}
                          value={course.credits}
                          onChange={(e) =>
                            updateCourse(
                              course.canvas_id,
                              "credits",
                              parseInt(e.target.value) || 3,
                            )
                          }
                          className="w-full rounded border border-gray-300 px-2 py-0.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">
                          Difficulty (1–10)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          step={0.5}
                          value={course.difficulty_score}
                          onChange={(e) =>
                            updateCourse(
                              course.canvas_id,
                              "difficulty_score",
                              parseFloat(e.target.value) || 5,
                            )
                          }
                          className="w-full rounded border border-gray-300 px-2 py-0.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">
                          Workload h/wk
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          step={0.5}
                          value={course.weekly_workload_hours}
                          onChange={(e) =>
                            updateCourse(
                              course.canvas_id,
                              "weekly_workload_hours",
                              parseFloat(e.target.value) || 3,
                            )
                          }
                          className="w-full rounded border border-gray-300 px-2 py-0.5 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-xs text-red-600 rounded border border-red-200 bg-red-50 px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStep("form")}
              className="flex-1"
            >
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
      )}

      {/* ── Step 3: success ── */}
      {step === "done" && (
        <div className="text-center space-y-3 py-2">
          <p className="text-sm font-semibold text-green-700">
            {importCount} course{importCount !== 1 ? "s" : ""} imported successfully.
          </p>
          <p className="text-xs text-gray-500">
            Review them below and run a scenario when ready.
          </p>
          <Button size="sm" onClick={handleClose} className="w-full">
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
