"use client";

import { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { simulationsApi } from "@/lib/api";
import type { SimulationResult } from "@/lib/types";

const STUDENT_ID_KEY = "adt_student_id";

interface WellnessEntry {
  date: string; // YYYY-MM-DD
  mood: number; // 1–5
  energy: number; // 1–5
  notes: string;
}

function wellnessKey(studentId: number) {
  return `adt_wellness_${studentId}`;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDateLabel(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function SliderInput({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  const emojis = ["", "😞", "😕", "😐", "🙂", "😄"];
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <span className="text-lg">{emojis[value]}</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={1}
          max={5}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className={`flex-1 h-2 rounded-full appearance-none cursor-pointer ${color}`}
        />
        <span className={`text-sm font-bold w-6 text-center ${color.replace("bg-", "text-").replace("-400", "-600")}`}>
          {value}
        </span>
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
        <span>1 Low</span>
        <span>5 High</span>
      </div>
    </div>
  );
}

export default function WellnessPage() {
  const [studentId, setStudentId] = useState<number>(0);
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [simulations, setSimulations] = useState<SimulationResult[]>([]);

  // Form state
  const [date, setDate] = useState(todayISO());
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [noteText, setNoteText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sid = parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0");
    if (!sid) return;
    setStudentId(sid);
    const stored = localStorage.getItem(wellnessKey(sid));
    if (stored) {
      try { setEntries(JSON.parse(stored)); } catch { /* ignore */ }
    }
    simulationsApi.history(sid).then(setSimulations).catch(() => {});
  }, []);

  function handleLogEntry() {
    if (!studentId) return;
    const newEntry: WellnessEntry = { date, mood, energy, notes: noteText };
    const updated = entries.filter((e) => e.date !== date);
    updated.push(newEntry);
    updated.sort((a, b) => a.date.localeCompare(b.date));
    setEntries(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(wellnessKey(studentId), JSON.stringify(updated));
    }
    setNoteText("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Last 30 days chart data
  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (29 - i));
      const iso = d.toISOString().split("T")[0];
      const entry = entries.find((e) => e.date === iso);
      return {
        date: formatDateLabel(iso),
        mood: entry?.mood ?? null,
        energy: entry?.energy ?? null,
      };
    });
  }, [entries]);

  // Last 7 days table
  const recent = useMemo(() => {
    return [...entries]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
  }, [entries]);

  // Correlation insight
  const correlationInsight = useMemo(() => {
    if (entries.length < 2 || simulations.length === 0) return null;
    // Days after HIGH burnout sims
    const highBurnoutDates = new Set(
      simulations
        .filter((s) => s.summary.burnout_risk === "HIGH" && s.created_at)
        .map((s) => {
          const d = new Date(s.created_at!);
          d.setDate(d.getDate() + 1);
          return d.toISOString().split("T")[0];
        })
    );
    const afterHighEntries = entries.filter((e) => highBurnoutDates.has(e.date));
    if (afterHighEntries.length === 0) return null;
    const avgMood = afterHighEntries.reduce((s, e) => s + e.mood, 0) / afterHighEntries.length;
    return `On days after HIGH burnout simulations, your average mood was ${avgMood.toFixed(1)}/5.`;
  }, [entries, simulations]);

  // Pre-fill existing entry for selected date
  useEffect(() => {
    const existing = entries.find((e) => e.date === date);
    if (existing) {
      setMood(existing.mood);
      setEnergy(existing.energy);
      setNoteText(existing.notes);
    } else {
      setMood(3);
      setEnergy(3);
      setNoteText("");
    }
  }, [date, entries]);

  const moodEmoji = ["", "😞", "😕", "😐", "🙂", "😄"];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Wellness Journal</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Track your daily mood and energy to spot patterns alongside your simulations.
        </p>
      </div>

      {/* Log entry form */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Log Today&apos;s Entry</h2>

        {/* Date picker */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayISO()}
            className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <SliderInput
          label="Mood"
          value={mood}
          onChange={setMood}
          color="bg-purple-400"
        />
        <SliderInput
          label="Energy"
          value={energy}
          onChange={setEnergy}
          color="bg-amber-400"
        />

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="How are you feeling today? Any factors affecting your mood or energy?"
            rows={3}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLogEntry}
            disabled={!studentId}
            className="rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
          >
            Log Entry
          </button>
          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
              Saved!
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      {entries.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Mood &amp; Energy — Last 30 Days
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: number | null) => (v !== null ? [v.toFixed(0) + " / 5", ""] : ["—", ""])}
                labelFormatter={(l) => `Date: ${l}`}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="mood"
                name="Mood"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 3, fill: "#8b5cf6" }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="energy"
                name="Energy"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3, fill: "#f59e0b" }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Correlation insight */}
      {correlationInsight && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-300">
          <span className="font-semibold">Insight: </span>{correlationInsight}
        </div>
      )}

      {/* Recent entries table */}
      {recent.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Recent Entries (Last 7 Days)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date</th>
                  <th className="text-center py-2 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Mood</th>
                  <th className="text-center py-2 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Energy</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((e) => (
                  <tr key={e.date} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-400">{formatDateLabel(e.date)}</td>
                    <td className="py-2 pr-4 text-center">
                      <span className="font-semibold text-purple-600 dark:text-purple-400">{e.mood}</span>
                      <span className="ml-1">{moodEmoji[e.mood]}</span>
                    </td>
                    <td className="py-2 pr-4 text-center">
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{e.energy}</span>
                    </td>
                    <td className="py-2 text-slate-500 dark:text-slate-400 text-xs max-w-[200px] truncate">
                      {e.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="flex h-32 items-center justify-center">
          <p className="text-slate-400 text-sm">No entries yet — log your first entry above.</p>
        </div>
      )}
    </div>
  );
}
