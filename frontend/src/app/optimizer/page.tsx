"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { BurnoutBadge } from "@/components/ui/Badge";
import { PerformanceTrajectory } from "@/components/charts/PerformanceTrajectory";
import { useScenario } from "@/hooks/useScenario";
import { useStudent } from "@/hooks/useStudent";
import type { OptimizationObjective } from "@/lib/types";

const STUDENT_ID_KEY = "adt_student_id";

const OBJECTIVES: { value: OptimizationObjective; label: string; desc: string }[] = [
  { value: "maximize_gpa", label: "Maximize GPA", desc: "Best academic performance within constraints" },
  { value: "minimize_burnout", label: "Minimize Burnout", desc: "Most sustainable schedule possible" },
  { value: "balanced", label: "Balanced", desc: "Optimize both GPA and sustainability" },
];

export default function OptimizerPage() {
  const { student, loadStudent } = useStudent();
  const { optimizationResult, isLoading, error, runOptimization } = useScenario();
  const [objective, setObjective] = useState<OptimizationObjective>("maximize_gpa");
  const [maxWork, setMaxWork] = useState(20);
  const [minSleep, setMinSleep] = useState(6.0);
  const [targetGpa, setTargetGpa] = useState(3.0);

  useEffect(() => {
    const stored = localStorage.getItem(STUDENT_ID_KEY);
    if (stored) loadStudent(parseInt(stored));
  }, []);

  const handleOptimize = async () => {
    if (!student) return;
    await runOptimization({
      student_id: student.id,
      num_weeks: 16,
      constraints: { max_work_hours_per_week: maxWork, min_sleep_hours: minSleep, target_min_gpa: targetGpa },
      objective,
    });
  };

  if (!student) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Set up your profile first.</p>
        <Link href="/profile"><Button>Go to Profile</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule Optimizer</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Find the optimal work hours, sleep, and study strategy using differential evolution.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Optimization Settings">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Objective</label>
              <div className="space-y-2">
                {OBJECTIVES.map((obj) => (
                  <label key={obj.value} className={`flex items-start gap-3 cursor-pointer rounded-lg border p-3 transition-colors ${objective === obj.value ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="objective" value={obj.value} checked={objective === obj.value}
                      onChange={() => setObjective(obj.value)} className="mt-0.5 accent-brand-600" />
                    <div>
                      <p className="text-sm font-medium">{obj.label}</p>
                      <p className="text-xs text-gray-500">{obj.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Work Hours/Week: <span className="font-semibold text-brand-600">{maxWork}h</span>
              </label>
              <input type="range" min={0} max={60} step={1} value={maxWork}
                onChange={(e) => setMaxWork(parseInt(e.target.value))} className="w-full accent-brand-600" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Sleep/Night: <span className="font-semibold text-brand-600">{minSleep}h</span>
              </label>
              <input type="range" min={4} max={10} step={0.5} value={minSleep}
                onChange={(e) => setMinSleep(parseFloat(e.target.value))} className="w-full accent-brand-600" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Target GPA: <span className="font-semibold text-brand-600">{targetGpa.toFixed(1)}</span>
              </label>
              <input type="range" min={0} max={4.0} step={0.1} value={targetGpa}
                onChange={(e) => setTargetGpa(parseFloat(e.target.value))} className="w-full accent-brand-600" />
            </div>

            <Button onClick={handleOptimize} isLoading={isLoading} className="w-full" size="lg">
              Run Optimizer
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Uses differential evolution — may take 10–30 seconds
            </p>
          </div>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {isLoading && (
            <div className="flex h-40 items-center justify-center">
              <Spinner size="lg" />
              <span className="ml-3 text-sm text-gray-500">Searching schedule space…</span>
            </div>
          )}

          {optimizationResult && !isLoading && (
            <>
              <Card title="Optimal Schedule Found">
                <div className="space-y-3">
                  {[
                    { label: "Work Hours/Week", value: `${optimizationResult.optimal_work_hours.toFixed(1)}h` },
                    { label: "Sleep/Night", value: `${optimizationResult.optimal_sleep_hours.toFixed(1)}h` },
                    { label: "Study Strategy", value: optimizationResult.optimal_study_strategy },
                    { label: "Predicted GPA", value: optimizationResult.predicted_gpa.toFixed(2) },
                    { label: "Burnout Probability", value: `${(optimizationResult.predicted_burnout_probability * 100).toFixed(0)}%` },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
                      <span className="text-gray-500">{row.label}</span>
                      <span className="font-semibold text-gray-900">{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <BurnoutBadge risk={optimizationResult.simulation_result.summary.burnout_risk} />
                </div>
              </Card>

              <Card title="Optimal GPA Trajectory">
                <PerformanceTrajectory result={optimizationResult.simulation_result} />
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
