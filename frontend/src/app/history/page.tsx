"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { simulationsApi } from "@/lib/api";
import { BurnoutBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import type { SimulationResult } from "@/lib/types";

const STUDENT_ID_KEY = "adt_student_id";

function riskColor(risk: string) {
  if (risk === "HIGH") return "text-red-600 dark:text-red-400";
  if (risk === "MEDIUM") return "text-amber-600 dark:text-amber-400";
  return "text-green-600 dark:text-green-400";
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StrategyBadge({ strategy }: { strategy: string }) {
  const colors: Record<string, string> = {
    spaced: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    mixed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    cramming: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${colors[strategy] ?? "bg-slate-100 text-slate-600"}`}>
      {strategy}
    </span>
  );
}

export default function HistoryPage() {
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const studentId = typeof window !== "undefined"
    ? parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0")
    : 0;

  useEffect(() => {
    if (!studentId) { setIsLoading(false); return; }
    simulationsApi
      .history(studentId)
      .then((data) => setResults([...data].reverse())) // newest first
      .catch(() => setError("Failed to load history."))
      .finally(() => setIsLoading(false));
  }, [studentId]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this simulation? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await simulationsApi.delete(id);
      setResults((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("Failed to delete simulation.");
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) return <PageSkeleton />;

  if (!studentId || error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-500 text-sm">{error ?? "No student profile found."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Simulation History</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {results.length} simulation{results.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/scenarios">
          <Button size="sm">Run New Scenario</Button>
        </Link>
      </div>

      {results.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">No simulations yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            Run your first scenario to see it here with all historical comparisons.
          </p>
          <Link href="/scenarios">
            <Button>Run a Scenario</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((result, idx) => {
            const { summary, scenario_config: cfg } = result;
            const isLatest = idx === 0;
            return (
              <Card key={result.id ?? idx} padding="sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: name + meta */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                      #{result.id ?? results.length - idx}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {cfg.scenario_name ?? `Scenario ${result.id ?? results.length - idx}`}
                        </span>
                        {isLatest && (
                          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 shrink-0">
                            Latest
                          </span>
                        )}
                        <StrategyBadge strategy={cfg.study_strategy} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-slate-400 dark:text-slate-500">
                        <span>{formatDate(result.created_at)}</span>
                        <span>·</span>
                        <span>{cfg.num_weeks}w semester</span>
                        {cfg.work_hours_per_week > 0 && (
                          <>
                            <span>·</span>
                            <span>{cfg.work_hours_per_week}h/wk work</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{cfg.sleep_target_hours}h sleep</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: stats + actions */}
                  <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                    {/* GPA */}
                    <div className="text-center">
                      <p className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
                        {summary.predicted_gpa_mean.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">GPA</p>
                    </div>

                    {/* Burnout */}
                    <div className="text-center">
                      <p className={`text-lg font-bold leading-tight ${riskColor(summary.burnout_risk)}`}>
                        {(summary.burnout_probability * 100).toFixed(0)}%
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">Burnout</p>
                    </div>

                    {/* Badge */}
                    <BurnoutBadge risk={summary.burnout_risk} />

                    {/* Actions */}
                    <div className="flex gap-2 ml-auto sm:ml-0">
                      <Link href={`/scenarios/${result.id}`}>
                        <Button variant="secondary" size="sm">View</Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        isLoading={deletingId === result.id}
                        onClick={() => result.id != null && handleDelete(result.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Recommendation snippet */}
                {summary.recommendation && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 line-clamp-1">
                    {summary.recommendation}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
