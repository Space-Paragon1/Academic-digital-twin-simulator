"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { leaderboardApi } from "@/lib/api";
import type { LeaderboardEntry } from "@/lib/api";
import { simulationsApi } from "@/lib/api";

const STUDENT_ID_KEY = "adt_student_id";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const RISK_COLOR: Record<string, string> = {
  LOW: "text-green-600 dark:text-green-400",
  MEDIUM: "text-amber-600 dark:text-amber-400",
  HIGH: "text-red-600 dark:text-red-400",
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myBestGpa, setMyBestGpa] = useState<number | null>(null);

  useEffect(() => {
    leaderboardApi
      .get()
      .then(setEntries)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load leaderboard.")
      )
      .finally(() => setLoading(false));

    // Load current user's best GPA to highlight their row
    const sid = parseInt(
      typeof window !== "undefined" ? localStorage.getItem(STUDENT_ID_KEY) ?? "0" : "0"
    );
    if (sid) {
      simulationsApi
        .history(sid)
        .then((sims) => {
          if (sims.length > 0) {
            const best = Math.max(...sims.map((s) => s.summary.predicted_gpa_mean));
            setMyBestGpa(Math.round(best * 100) / 100);
          }
        })
        .catch(() => {});
    }
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Leaderboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Top 10 anonymous students by best predicted GPA. No names — only results.
        </p>
      </div>

      {loading && (
        <div className="flex h-40 items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="flex h-40 items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No simulations yet — be the first on the leaderboard!
          </p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <Card title="Top Students">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Rank
                  </th>
                  <th className="text-left py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    GPA
                  </th>
                  <th className="text-left py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Burnout Risk
                  </th>
                  <th className="text-left py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Strategy
                  </th>
                  <th className="text-left py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Weeks
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isMe =
                    myBestGpa !== null &&
                    Math.abs(entry.gpa_mean - myBestGpa) < 0.001;
                  return (
                    <tr
                      key={entry.rank}
                      className={[
                        "border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors",
                        isMe
                          ? "bg-brand-50 dark:bg-brand-900/20"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                      ].join(" ")}
                    >
                      <td className="py-3 pr-4 font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        <span className="mr-1">{MEDAL[entry.rank] ?? ""}</span>
                        #{entry.rank}
                        {isMe && (
                          <span className="ml-2 text-[10px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-100 dark:bg-brand-800/30 rounded-full px-1.5 py-0.5">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-bold text-slate-900 dark:text-slate-100">
                        {entry.gpa_mean.toFixed(2)}
                      </td>
                      <td className={`py-3 pr-4 font-medium ${RISK_COLOR[entry.burnout_risk] ?? ""}`}>
                        {entry.burnout_risk}
                      </td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-400 capitalize">
                        {entry.strategy}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400">
                        {entry.week_count}w
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-600 text-center">
        Rankings are anonymous — no personal data is shared. Updated in real time.
      </p>
    </div>
  );
}
