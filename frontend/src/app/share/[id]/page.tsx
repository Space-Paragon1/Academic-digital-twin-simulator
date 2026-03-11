"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { simulationsApi } from "@/lib/api";
import { BurnoutBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import type { SimulationResult } from "@/lib/types";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-center">
      <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SharePage() {
  const params = useParams();
  const id = Number(params.id);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setError("Invalid link."); setIsLoading(false); return; }
    simulationsApi.get(id)
      .then(setResult)
      .catch(() => setError("Simulation not found or no longer available."))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <PageSkeleton />;

  if (error || !result) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{error ?? "Not found"}</p>
          <Link href="/" className="text-sm text-brand-600 hover:underline">Go to Academic Twin →</Link>
        </div>
      </div>
    );
  }

  const { summary, scenario_config: cfg } = result;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 px-4 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 mb-2">
            Shared Simulation Result
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {cfg.scenario_name ?? `Scenario #${result.id}`}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {cfg.num_weeks}-week semester · {cfg.study_strategy} strategy ·{" "}
            {cfg.sleep_target_hours}h sleep · {cfg.work_hours_per_week}h/wk work
          </p>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Predicted GPA"
            value={summary.predicted_gpa_mean.toFixed(2)}
            sub={`± ${summary.predicted_gpa_std?.toFixed(2) ?? "—"}`}
          />
          <StatCard
            label="Burnout Risk"
            value={`${(summary.burnout_probability * 100).toFixed(0)}%`}
            sub={summary.burnout_risk}
          />
          <StatCard
            label="Avg Cognitive Load"
            value={summary.avg_cognitive_load?.toFixed(1) ?? "—"}
            sub="out of 10"
          />
          <StatCard
            label="Avg Retention"
            value={summary.avg_retention_score !== undefined ? `${(summary.avg_retention_score * 100).toFixed(0)}%` : "—"}
            sub="knowledge retained"
          />
        </div>

        {/* Burnout badge + recommendation */}
        <Card title="Summary">
          <div className="flex items-center gap-3 mb-4">
            <BurnoutBadge risk={summary.burnout_risk} />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Burnout probability: <strong className="text-slate-700 dark:text-slate-300">{(summary.burnout_probability * 100).toFixed(1)}%</strong>
            </span>
          </div>
          {summary.recommendation && (
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4">
              {summary.recommendation}
            </p>
          )}
        </Card>

        {/* CTA */}
        <div className="text-center space-y-2 pt-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Want to simulate your own academic schedule?
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-shadow"
          >
            Try Academic Digital Twin →
          </Link>
        </div>

      </div>
    </div>
  );
}
