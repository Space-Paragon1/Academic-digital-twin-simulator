"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { advisorApi } from "@/lib/api";
import type { GoalTargetResult } from "@/lib/types";

function GpaBadge({ gpa }: { gpa: number }) {
  const color = gpa >= 3.5 ? "text-green-700 bg-green-50 border-green-200"
    : gpa >= 3.0 ? "text-blue-700 bg-blue-50 border-blue-200"
    : "text-amber-700 bg-amber-50 border-amber-200";
  return (
    <span className={`inline-block rounded-full border px-3 py-0.5 text-sm font-semibold ${color}`}>
      {gpa.toFixed(2)}
    </span>
  );
}

export default function GoalTargetPage() {
  const [studentId,   setStudentId]   = useState<number | null>(null);
  const [targetGpa,   setTargetGpa]   = useState(3.5);
  const [maxWorkHrs,  setMaxWorkHrs]  = useState(20);
  const [numWeeks,    setNumWeeks]    = useState(16);
  const [isLoading,   setIsLoading]   = useState(false);
  const [result,      setResult]      = useState<GoalTargetResult | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("adt_student_id");
    if (id) setStudentId(parseInt(id));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await advisorApi.goalTarget({
        student_id:    studentId,
        target_gpa:    targetGpa,
        num_weeks:     numWeeks,
        max_work_hours: maxWorkHrs,
        exam_weeks:    [Math.round(numWeeks / 2), numWeeks],
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Goal targeting failed.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!studentId) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400 text-sm">
        No student profile found. Create one on the Profile page first.
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card title="Find Your Schedule" subtitle="Tell us your GPA goal — we'll find the schedule to get there">
        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          {/* Target GPA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target GPA: <span className="font-bold text-brand-600">{targetGpa.toFixed(1)}</span>
            </label>
            <input
              type="range" min={1.0} max={4.0} step={0.1} value={targetGpa}
              onChange={(e) => setTargetGpa(parseFloat(e.target.value))}
              className="w-full accent-brand-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1.0 (D)</span><span>2.0 (C)</span><span>3.0 (B)</span><span>4.0 (A)</span>
            </div>
          </div>

          {/* Max work hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Work Hours/Week: <span className="font-bold text-brand-600">{maxWorkHrs}h</span>
            </label>
            <input
              type="range" min={0} max={40} step={5} value={maxWorkHrs}
              onChange={(e) => setMaxWorkHrs(parseInt(e.target.value))}
              className="w-full accent-brand-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0h</span><span>20h</span><span>40h</span>
            </div>
          </div>

          {/* Semester length */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Semester Length: <span className="font-bold text-brand-600">{numWeeks} weeks</span>
            </label>
            <input
              type="range" min={4} max={20} step={1} value={numWeeks}
              onChange={(e) => setNumWeeks(parseInt(e.target.value))}
              className="w-full accent-brand-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>4 wks</span><span>12 wks</span><span>20 wks</span>
            </div>
          </div>

          <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
            {isLoading ? "Searching schedules…" : "Find My Schedule"}
          </Button>
          {isLoading && (
            <p className="text-xs text-center text-gray-400">
              Testing multiple schedule combinations — this may take 10–30 seconds.
            </p>
          )}
        </form>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <Card
          title={result.achievable ? "Schedule Found" : "Best Possible Schedule"}
          subtitle={
            result.achievable
              ? `Your target GPA of ${targetGpa.toFixed(1)} is achievable`
              : `Target GPA ${targetGpa.toFixed(1)} is not reachable — showing closest schedule`
          }
        >
          <div className="space-y-5 mt-2">
            {/* Achievable badge */}
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold border ${
                result.achievable
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                {result.achievable ? "✓ Achievable" : "⚠ Not quite achievable"}
              </span>
              <span className="text-sm text-gray-500">Predicted GPA:</span>
              <GpaBadge gpa={result.predicted_gpa} />
              {result.gap_to_target > 0 && (
                <span className="text-xs text-gray-400">({result.gap_to_target.toFixed(2)} below target)</span>
              )}
            </div>

            {/* Recommended schedule */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Work Hours", value: `${result.recommended_work_hours.toFixed(0)}h/wk` },
                { label: "Sleep",      value: `${result.recommended_sleep_hours.toFixed(1)}h/night` },
                { label: "Strategy",   value: result.recommended_strategy.charAt(0).toUpperCase() + result.recommended_strategy.slice(1) },
                { label: "Study Time", value: `${result.required_study_hours_per_week}h/wk` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Tips */}
            {result.tips.length > 0 && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">Advisor Tips</p>
                <ul className="space-y-1">
                  {result.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-blue-800 flex gap-2">
                      <span className="shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
