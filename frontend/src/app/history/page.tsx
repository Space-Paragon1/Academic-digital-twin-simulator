"use client";

import { useEffect, useState, useMemo } from "react";
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

function handleExportCSV(results: SimulationResult[]) {
  const rows = [
    ["ID", "Scenario", "Date", "Strategy", "GPA", "Burnout %", "Burnout Risk", "Sleep (h)", "Work (h/wk)", "Weeks"],
    ...results.map((r) => [
      r.id ?? "",
      r.scenario_config.scenario_name ?? "",
      r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
      r.scenario_config.study_strategy,
      r.summary.predicted_gpa_mean.toFixed(2),
      (r.summary.burnout_probability * 100).toFixed(0) + "%",
      r.summary.burnout_risk,
      r.scenario_config.sleep_target_hours,
      r.scenario_config.work_hours_per_week,
      r.scenario_config.num_weeks,
    ]),
  ];
  const csv = rows.map((row) => row.map(String).map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "simulation-history.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type SortOption = "newest" | "oldest" | "gpa-high" | "gpa-low";
type RiskFilter = "ALL" | "LOW" | "MEDIUM" | "HIGH";
type StrategyFilter = "ALL" | "spaced" | "mixed" | "cramming";

export default function HistoryPage() {
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Feature 5: Filter/search state
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("ALL");
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

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

  // Feature 5: Apply filters + sort client-side
  const filtered = useMemo(() => {
    let out = [...results];

    // Text search by scenario name
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      out = out.filter((r) =>
        (r.scenario_config.scenario_name ?? "").toLowerCase().includes(q) ||
        String(r.id).includes(q)
      );
    }

    // Risk filter
    if (riskFilter !== "ALL") {
      out = out.filter((r) => r.summary.burnout_risk === riskFilter);
    }

    // Strategy filter
    if (strategyFilter !== "ALL") {
      out = out.filter((r) => r.scenario_config.study_strategy === strategyFilter);
    }

    // Sort
    switch (sortBy) {
      case "newest":
        out.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
        break;
      case "oldest":
        out.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
        break;
      case "gpa-high":
        out.sort((a, b) => b.summary.predicted_gpa_mean - a.summary.predicted_gpa_mean);
        break;
      case "gpa-low":
        out.sort((a, b) => a.summary.predicted_gpa_mean - b.summary.predicted_gpa_mean);
        break;
    }

    return out;
  }, [results, searchQuery, riskFilter, strategyFilter, sortBy]);

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Simulation History</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {results.length} simulation{results.length !== 1 ? "s" : ""} total
            {filtered.length !== results.length && ` · ${filtered.length} shown`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {results.length > 0 && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExportCSV(results)}
                title="Download CSV — then open Google Sheets → File → Import to view your data"
              >
                Export CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                Print / PDF
              </Button>
            </>
          )}
          <Link href="/scenarios">
            <Button size="sm">Run New Scenario</Button>
          </Link>
        </div>
      </div>

      {/* Feature 5: Filter / search bar */}
      {results.length > 0 && (
        <div className="flex flex-wrap gap-3 items-end">
          {/* Text search */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by scenario name…"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Burnout risk filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Burnout Risk</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
              title="Filter by burnout risk"
              className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none"
            >
              <option value="ALL">All Risks</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>

          {/* Strategy filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Strategy</label>
            <select
              value={strategyFilter}
              onChange={(e) => setStrategyFilter(e.target.value as StrategyFilter)}
              title="Filter by study strategy"
              className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none"
            >
              <option value="ALL">All Strategies</option>
              <option value="spaced">Spaced</option>
              <option value="mixed">Mixed</option>
              <option value="cramming">Cramming</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              title="Sort simulations"
              className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="gpa-high">GPA High→Low</option>
              <option value="gpa-low">GPA Low→High</option>
            </select>
          </div>

          {/* Clear filters */}
          {(searchQuery || riskFilter !== "ALL" || strategyFilter !== "ALL" || sortBy !== "newest") && (
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setRiskFilter("ALL"); setStrategyFilter("ALL"); setSortBy("newest"); }}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline self-end pb-2"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

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
      ) : filtered.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">No simulations match your filters.</p>
          <button
            type="button"
            onClick={() => { setSearchQuery(""); setRiskFilter("ALL"); setStrategyFilter("ALL"); setSortBy("newest"); }}
            className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((result, idx) => {
            const { summary, scenario_config: cfg } = result;
            const isLatest = result.id === results[0]?.id;
            return (
              <Card key={result.id ?? idx} padding="sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: name + meta */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                      #{result.id ?? idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {cfg.scenario_name ?? `Scenario ${result.id ?? idx + 1}`}
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
                      <Link href={`/advisor?explain=${result.id}`}>
                        <Button variant="secondary" size="sm">Explain</Button>
                      </Link>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const url = `${window.location.origin}/share/${result.id}`;
                          navigator.clipboard.writeText(url).then(() => alert("Share link copied!"));
                        }}
                      >
                        Share
                      </Button>
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
