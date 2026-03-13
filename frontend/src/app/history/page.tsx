"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NotebookPen, SlidersHorizontal } from "lucide-react";
import { simulationsApi, notesApi, tagsApi } from "@/lib/api";
import { BurnoutBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import type { SimulationResult } from "@/lib/types";

const STUDENT_ID_KEY = "adt_student_id";
const RERUN_KEY = "adt_rerun_config";

const COMMON_TAGS = ["Finals", "Part-time", "Study abroad", "Internship", "Summer"];

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
  const router = useRouter();
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter/search state
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("ALL");
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [tagFilter, setTagFilter] = useState<string>("ALL");

  // Notes state: simId → note text
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [openNoteId, setOpenNoteId] = useState<number | null>(null);
  const [savingNoteId, setSavingNoteId] = useState<number | null>(null);

  // Tags state: simId → string[]
  const [tags, setTags] = useState<Record<number, string[]>>({});
  const [addingTagId, setAddingTagId] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState<Record<number, string>>({});

  const studentId = typeof window !== "undefined"
    ? parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0")
    : 0;

  useEffect(() => {
    if (!studentId) { setIsLoading(false); return; }
    simulationsApi
      .history(studentId)
      .then(async (data) => {
        const reversed = [...data].reverse();
        setResults(reversed);
        // Load notes and tags for all sims
        const noteMap: Record<number, string> = {};
        const tagMap: Record<number, string[]> = {};
        await Promise.allSettled(
          reversed
            .filter((r) => r.id != null)
            .map(async (r) => {
              const id = r.id!;
              const [noteRes, tagRes] = await Promise.allSettled([
                notesApi.get(id),
                tagsApi.get(id),
              ]);
              if (noteRes.status === "fulfilled" && noteRes.value.note) {
                noteMap[id] = noteRes.value.note;
              }
              if (tagRes.status === "fulfilled") {
                tagMap[id] = tagRes.value.tags ?? [];
              }
            })
        );
        setNotes(noteMap);
        setTags(tagMap);
      })
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

  const handleSaveNote = useCallback(async (simId: number) => {
    setSavingNoteId(simId);
    try {
      await notesApi.save(simId, notes[simId] ?? "");
    } catch {
      // silent fail
    } finally {
      setSavingNoteId(null);
    }
  }, [notes]);

  async function handleSaveTag(simId: number) {
    const input = (tagInput[simId] ?? "").trim();
    if (!input) return;
    const existing = tags[simId] ?? [];
    if (existing.includes(input)) {
      setTagInput((prev) => ({ ...prev, [simId]: "" }));
      return;
    }
    const updated = [...existing, input];
    setTags((prev) => ({ ...prev, [simId]: updated }));
    setTagInput((prev) => ({ ...prev, [simId]: "" }));
    try {
      await tagsApi.save(simId, updated);
    } catch {
      // silent fail
    }
  }

  async function handleAddCommonTag(simId: number, tag: string) {
    const existing = tags[simId] ?? [];
    if (existing.includes(tag)) return;
    const updated = [...existing, tag];
    setTags((prev) => ({ ...prev, [simId]: updated }));
    try {
      await tagsApi.save(simId, updated);
    } catch {
      // silent fail
    }
  }

  async function handleRemoveTag(simId: number, tag: string) {
    const updated = (tags[simId] ?? []).filter((t) => t !== tag);
    setTags((prev) => ({ ...prev, [simId]: updated }));
    try {
      await tagsApi.save(simId, updated);
    } catch {
      // silent fail
    }
  }

  function handleTweak(result: SimulationResult) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(RERUN_KEY, JSON.stringify(result.scenario_config));
    }
    router.push("/scenarios");
  }

  // Collect all unique tags across all simulations
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    Object.values(tags).forEach((ts) => ts.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [tags]);

  // Apply filters + sort
  const filtered = useMemo(() => {
    let out = [...results];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      out = out.filter((r) =>
        (r.scenario_config.scenario_name ?? "").toLowerCase().includes(q) ||
        String(r.id).includes(q)
      );
    }

    if (riskFilter !== "ALL") {
      out = out.filter((r) => r.summary.burnout_risk === riskFilter);
    }

    if (strategyFilter !== "ALL") {
      out = out.filter((r) => r.scenario_config.study_strategy === strategyFilter);
    }

    if (tagFilter !== "ALL") {
      out = out.filter((r) => r.id != null && (tags[r.id] ?? []).includes(tagFilter));
    }

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
  }, [results, searchQuery, riskFilter, strategyFilter, sortBy, tagFilter, tags]);

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

      {/* Filter / search bar */}
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

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tag</label>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                title="Filter by tag"
                className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none"
              >
                <option value="ALL">All Tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

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
          {(searchQuery || riskFilter !== "ALL" || strategyFilter !== "ALL" || sortBy !== "newest" || tagFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setRiskFilter("ALL"); setStrategyFilter("ALL"); setSortBy("newest"); setTagFilter("ALL"); }}
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
            onClick={() => { setSearchQuery(""); setRiskFilter("ALL"); setStrategyFilter("ALL"); setSortBy("newest"); setTagFilter("ALL"); }}
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
            const simId = result.id;
            const simNote = simId != null ? (notes[simId] ?? "") : "";
            const simTags = simId != null ? (tags[simId] ?? []) : [];
            const hasNote = simNote.trim().length > 0;
            const isNoteOpen = simId != null && openNoteId === simId;
            const isTagOpen = simId != null && addingTagId === simId;

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
                        {hasNote && (
                          <span className="text-[11px]" title="Has a note">📝</span>
                        )}
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
                      {/* Tags display */}
                      {simTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {simTags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            >
                              {tag}
                              {simId != null && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(simId, tag)}
                                  className="text-slate-400 hover:text-red-500 leading-none"
                                  title={`Remove tag "${tag}"`}
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
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
                    <div className="flex gap-1.5 ml-auto sm:ml-0 flex-wrap">
                      {/* Note button */}
                      {simId != null && (
                        <button
                          type="button"
                          title={hasNote ? "Edit note" : "Add note"}
                          onClick={() => setOpenNoteId(isNoteOpen ? null : simId)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors border ${
                            hasNote || isNoteOpen
                              ? "border-amber-200 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          }`}
                        >
                          <NotebookPen size={12} />
                          Note
                        </button>
                      )}

                      {/* Tags button */}
                      {simId != null && (
                        <button
                          type="button"
                          title="Manage tags"
                          onClick={() => setAddingTagId(isTagOpen ? null : simId)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors border ${
                            isTagOpen
                              ? "border-brand-200 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          }`}
                        >
                          # Tags
                        </button>
                      )}

                      {/* Tweak button */}
                      <button
                        type="button"
                        title="Tweak this scenario"
                        onClick={() => handleTweak(result)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <SlidersHorizontal size={12} />
                        Tweak
                      </button>

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

                {/* Inline Note editor */}
                {isNoteOpen && simId != null && (
                  <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Simulation Note
                    </label>
                    <textarea
                      value={simNote}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [simId]: e.target.value }))
                      }
                      onBlur={() => handleSaveNote(simId)}
                      placeholder="Add a note about this simulation…"
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                    />
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Auto-saves on blur
                      </span>
                      {savingNoteId === simId && (
                        <span className="text-[10px] text-brand-500">Saving…</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Inline Tag editor */}
                {isTagOpen && simId != null && (
                  <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                      Tags
                    </label>
                    {/* Common tag suggestions */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {COMMON_TAGS.map((tag) => {
                        const already = simTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            disabled={already}
                            onClick={() => handleAddCommonTag(simId, tag)}
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                              already
                                ? "border-brand-200 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 opacity-60 cursor-default"
                                : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-600 hover:text-brand-700 dark:hover:text-brand-300"
                            }`}
                          >
                            {already ? "✓ " : "+ "}{tag}
                          </button>
                        );
                      })}
                    </div>
                    {/* Custom tag input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput[simId] ?? ""}
                        onChange={(e) =>
                          setTagInput((prev) => ({ ...prev, [simId]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleSaveTag(simId); }
                        }}
                        placeholder="Type a custom tag…"
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSaveTag(simId)}
                        disabled={!(tagInput[simId] ?? "").trim()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                {/* Recommendation snippet */}
                {summary.recommendation && !isNoteOpen && !isTagOpen && (
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
