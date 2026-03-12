"use client";

import { useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WeeklySnapshot } from "@/lib/types";

interface Props {
  snapshots: WeeklySnapshot[];
}

export function SimulationReplay({ snapshots }: Props) {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setCurrentWeek((prev) => {
          if (prev >= snapshots.length - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, snapshots.length]);

  function handleReset() {
    setPlaying(false);
    setCurrentWeek(0);
  }

  if (snapshots.length === 0) return null;

  const snap = snapshots[currentWeek];
  const chartData = snapshots.slice(0, currentWeek + 1).map((s) => ({
    week: `W${s.week}`,
    gpa: s.predicted_gpa,
  }));

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Simulation Replay
        </p>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          Week {snap.week} / {snapshots[snapshots.length - 1].week}
        </span>
      </div>

      {/* Week slider */}
      <input
        type="range"
        min={0}
        max={snapshots.length - 1}
        value={currentWeek}
        onChange={(e) => {
          setPlaying(false);
          setCurrentWeek(parseInt(e.target.value));
        }}
        className="w-full accent-indigo-600"
        aria-label="Week selector"
      />

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPlaying((v) => !v)}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 text-xs font-semibold transition-colors"
        >
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-medium transition-colors"
        >
          ↺ Reset
        </button>
      </div>

      {/* Current week stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">GPA</p>
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            {snap.predicted_gpa.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Cog. Load</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {snap.cognitive_load.toFixed(0)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Burnout %</p>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">
            {(snap.burnout_probability * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* GPA chart up to current week */}
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={[0, 4.0]} tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6 }} formatter={(v: number) => [v.toFixed(2), "GPA"]} />
          <Line type="monotone" dataKey="gpa" stroke="#6366f1" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
