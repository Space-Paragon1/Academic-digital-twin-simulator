"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { BurnoutBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ScenarioBuilder } from "@/components/forms/ScenarioBuilder";
import { WhatIfPanel } from "@/components/ui/WhatIfPanel";
import { useSimulation } from "@/hooks/useSimulation";
import { useStudent } from "@/hooks/useStudent";
import { useScenario } from "@/hooks/useScenario";
import { useToast } from "@/components/ui/Toaster";
import type { ScenarioConfig } from "@/lib/types";

const STUDENT_ID_KEY = "adt_student_id";
const RERUN_KEY = "adt_rerun_config";

export default function ScenariosPage() {
  const { student, courses, isLoading: studentLoading, loadStudent, loadCourses } = useStudent();
  const { runSimulation, result, isLoading: simLoading, error: simError } = useSimulation();
  const { history, loadHistory, deleteSimulation } = useScenario();
  const toast = useToast();
  const [rerunConfig, setRerunConfig] = useState<Partial<ScenarioConfig> | undefined>(undefined);

  useEffect(() => {
    const stored = localStorage.getItem(STUDENT_ID_KEY);
    if (stored) {
      const id = parseInt(stored);
      loadStudent(id).catch(() => {});
      loadCourses(id).catch(() => {});
      loadHistory(id);
    }
    // Pick up any "Re-run with tweaks" config written by Scenario Detail
    const rerun = sessionStorage.getItem(RERUN_KEY);
    if (rerun) {
      try { setRerunConfig(JSON.parse(rerun)); } catch { /* ignore */ }
      sessionStorage.removeItem(RERUN_KEY);
    }
  }, []);

  const handleRun = async (config: ScenarioConfig) => {
    try {
      await runSimulation(config);
      toast.success("Simulation complete! View your results below.", "Done");
      if (student) loadHistory(student.id);
    } catch {
      // error shown inline by simError
    }
  };

  const handleDelete = async (simId: number) => {
    try {
      await deleteSimulation(simId);
      toast.info("Simulation deleted.");
    } catch {
      toast.error("Failed to delete simulation.");
    }
  };

  if (studentLoading) {
    return <PageSkeleton />;
  }

  if (!student) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Set up your profile first to run scenarios.</p>
        <Link href="/profile"><Button>Go to Profile</Button></Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Builder panel */}
      <div className="lg:col-span-1">
        <Card
          title={rerunConfig ? "Tweak & Re-run" : "New Scenario"}
          subtitle={rerunConfig ? "Pre-filled from previous scenario — adjust and run" : "Configure and run a simulation"}
        >
          {rerunConfig && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-3 py-2">
              <p className="text-xs text-brand-700 font-medium">Loaded from previous scenario</p>
              <button
                type="button"
                onClick={() => setRerunConfig(undefined)}
                className="text-xs text-brand-400 hover:text-brand-700 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
          <ScenarioBuilder
            studentId={student.id}
            courses={courses}
            onRun={handleRun}
            isLoading={simLoading}
            initialConfig={rerunConfig}
          />
        </Card>
      </div>

      {/* Results panel */}
      <div className="lg:col-span-2 space-y-4">
        {simError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{simError}</div>
        )}

        {simLoading && (
          <div className="flex h-40 items-center justify-center">
            <Spinner size="lg" />
            <span className="ml-3 text-sm text-gray-500">Running simulation…</span>
          </div>
        )}

        {result && !simLoading && (
          <div className="rounded-xl border-2 border-brand-200 bg-brand-50 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-brand-900">Latest Result</h3>
              <BurnoutBadge risk={result.summary.burnout_risk} />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500">Predicted GPA</p>
                <p className="text-2xl font-bold text-brand-700">{result.summary.predicted_gpa_mean.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Required Study</p>
                <p className="text-2xl font-bold text-brand-700">{result.summary.required_study_hours_per_week}h/wk</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Sleep Deficit</p>
                <p className="text-2xl font-bold text-brand-700">{result.summary.sleep_deficit_hours}h/wk</p>
              </div>
            </div>
            {result.summary.recommendation && (
              <p className="mt-3 text-sm text-blue-800 bg-blue-50 rounded p-2">{result.summary.recommendation}</p>
            )}
            <Link href={`/scenarios/${result.id}`}>
              <Button size="sm" variant="secondary" className="mt-3">View Full Report</Button>
            </Link>
          </div>
        )}

        {/* What-if panel — shows once there's at least one result */}
        {result && (
          <WhatIfPanel
            baseGpa={result.summary.predicted_gpa_mean}
            baseBurnout={result.summary.burnout_probability * 100}
            baseSleep={result.scenario_config.sleep_target_hours}
            baseWork={result.scenario_config.work_hours_per_week}
          />
        )}

        {/* History */}
        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Simulation History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No simulations yet. Run your first scenario above.</p>
        ) : (
          history.slice().reverse().map((sim, i) => (
            <div key={sim.id ?? i} className="relative group">
              <Link href={`/scenarios/${sim.id}`}>
                <Card className="hover:border-brand-300 transition-colors cursor-pointer" padding="sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{sim.scenario_config.scenario_name ?? `Scenario #${sim.id}`}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        GPA {sim.summary.predicted_gpa_mean.toFixed(2)} · {sim.scenario_config.num_weeks} weeks ·{" "}
                        {sim.scenario_config.study_strategy} study
                        {sim.created_at && (
                          <span className="text-gray-400">
                            {" "}· {new Date(sim.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <BurnoutBadge risk={sim.summary.burnout_risk} />
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (sim.id) handleDelete(sim.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 text-lg leading-none px-1"
                        title="Delete simulation"
                        aria-label="Delete simulation"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </Card>
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
