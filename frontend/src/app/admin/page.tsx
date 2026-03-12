"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BurnoutBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { studentsApi, simulationsApi } from "@/lib/api";
import type { SimulationResult, Student } from "@/lib/types";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

const SESSION_KEY = "adt_admin_unlocked";
const ADMIN_PIN   = "admin1234";

interface StudentRow {
  student: Student;
  latestSim: SimulationResult | null;
  simCount: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin]           = useState("");
  const [pinError, setPinError] = useState("");
  const [rows, setRows]         = useState<StudentRow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Check session on mount
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setUnlocked(true);
    }
  }, []);

  // Load data once unlocked
  useEffect(() => {
    if (!unlocked) return;
    setLoading(true);
    studentsApi
      .list()
      .then(async (students) => {
        const rowData = await Promise.all(
          students.map(async (s) => {
            try {
              const sims = await simulationsApi.history(s.id);
              return {
                student: s,
                latestSim: sims.length > 0 ? sims[sims.length - 1] : null,
                simCount: sims.length,
              };
            } catch {
              return { student: s, latestSim: null, simCount: 0 };
            }
          })
        );
        setRows(rowData);
      })
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoading(false));
  }, [unlocked]);

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
      setPinError("");
    } else {
      setPinError("Incorrect PIN. Please try again.");
    }
  }

  function handleLock() {
    sessionStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
    setPin("");
  }

  if (!unlocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center mb-4">
              <svg className="h-7 w-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin Access</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter the admin PIN to continue.</p>
          </div>

          <Card>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Admin PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              {pinError && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
                  {pinError}
                </div>
              )}
              <Button type="submit" className="w-full">
                Unlock Admin
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {rows.length} registered student{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleLock}>
          Lock Admin
        </Button>
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

      {!loading && !error && rows.length === 0 && (
        <div className="flex h-40 items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">No students registered yet.</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <Card title="All Students">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Name</th>
                  <th className="text-left py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</th>
                  <th className="text-left py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Registered</th>
                  <th className="text-center py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sims</th>
                  <th className="text-center py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Latest GPA</th>
                  <th className="text-center py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Burnout</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ student, latestSim, simCount }) => (
                  <tr key={student.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {student.name}
                    </td>
                    <td className="py-3 pr-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {student.email}
                    </td>
                    <td className="py-3 pr-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(student.created_at)}
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <span className="inline-flex items-center justify-center h-6 w-8 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {simCount}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-center font-semibold text-slate-900 dark:text-slate-100">
                      {latestSim ? latestSim.summary.predicted_gpa_mean.toFixed(2) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {latestSim ? (
                        <BurnoutBadge risk={latestSim.summary.burnout_risk} />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Summary stats */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card padding="sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Students</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{rows.length}</p>
          </Card>
          <Card padding="sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Simulations</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {rows.reduce((s, r) => s + r.simCount, 0)}
            </p>
          </Card>
          <Card padding="sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Avg GPA</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {(() => {
                const withSim = rows.filter((r) => r.latestSim);
                if (!withSim.length) return "—";
                return (withSim.reduce((s, r) => s + r.latestSim!.summary.predicted_gpa_mean, 0) / withSim.length).toFixed(2);
              })()}
            </p>
          </Card>
          <Card padding="sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">High Burnout</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {rows.filter((r) => r.latestSim?.summary.burnout_risk === "HIGH").length}
            </p>
          </Card>
        </div>
      )}

      {/* Analytics section */}
      {!loading && rows.length > 0 && (() => {
        const withSim = rows.filter((r) => r.latestSim);

        // GPA distribution
        const gpaBuckets = [
          { label: "< 2.0",    min: 0,   max: 2.0 },
          { label: "2.0–2.5",  min: 2.0, max: 2.5 },
          { label: "2.5–3.0",  min: 2.5, max: 3.0 },
          { label: "3.0–3.5",  min: 3.0, max: 3.5 },
          { label: "3.5–4.0",  min: 3.5, max: 4.01 },
        ].map((b) => ({
          ...b,
          count: withSim.filter((r) => {
            const g = r.latestSim!.summary.predicted_gpa_mean;
            return g >= b.min && g < b.max;
          }).length,
        }));

        // Burnout distribution
        const burnoutData = [
          { name: "LOW",    value: withSim.filter((r) => r.latestSim!.summary.burnout_risk === "LOW").length,    color: "#10b981" },
          { name: "MEDIUM", value: withSim.filter((r) => r.latestSim!.summary.burnout_risk === "MEDIUM").length, color: "#f59e0b" },
          { name: "HIGH",   value: withSim.filter((r) => r.latestSim!.summary.burnout_risk === "HIGH").length,   color: "#ef4444" },
        ].filter((d) => d.value > 0);

        // Strategy distribution
        const strategyData = (["spaced", "mixed", "cramming"] as const).map((name) => ({
          name,
          count: withSim.filter((r) => r.latestSim!.scenario_config.study_strategy === name).length,
        }));

        return (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card title="GPA Distribution">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={gpaBuckets} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [v, "Students"]} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Burnout Risk">
                {burnoutData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={burnoutData}
                        cx="50%"
                        cy="50%"
                        outerRadius={65}
                        dataKey="value"
                        label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {burnoutData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [v, "Students"]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[180px] items-center justify-center">
                    <p className="text-slate-400 text-sm">No data</p>
                  </div>
                )}
              </Card>

              <Card title="Study Strategies">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={strategyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [v, "Students"]} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
