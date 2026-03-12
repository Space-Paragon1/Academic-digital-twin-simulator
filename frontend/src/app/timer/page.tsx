"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";

const STUDENT_ID_KEY = "adt_student_id";
const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;
const CIRCUMFERENCE = 2 * Math.PI * 54; // radius=54

interface Session {
  date: string;
  minutes: number;
  type: "work" | "break";
}

function getStorageKey(studentId: number) {
  return `adt_timer_sessions_${studentId}`;
}

function loadSessions(studentId: number): Session[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(getStorageKey(studentId)) ?? "[]");
  } catch {
    return [];
  }
}

function saveSessions(studentId: number, sessions: Session[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStorageKey(studentId), JSON.stringify(sessions));
}

function todayStr() {
  return new Date().toDateString();
}

function computeStreak(sessions: Session[]): number {
  const days = new Set(sessions.map((s) => s.date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else break;
  }
  return streak;
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available — silently ignore
  }
}

export default function TimerPage() {
  const [studentId, setStudentId] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mode, setMode] = useState<"work" | "break">("work");
  const [secondsLeft, setSecondsLeft] = useState(WORK_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = mode === "work" ? WORK_MINUTES * 60 : BREAK_MINUTES * 60;
  const progress = (totalSeconds - secondsLeft) / totalSeconds;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const secs = (secondsLeft % 60).toString().padStart(2, "0");

  useEffect(() => {
    const sid = parseInt(
      typeof window !== "undefined" ? localStorage.getItem(STUDENT_ID_KEY) ?? "0" : "0"
    );
    setStudentId(sid);
    if (sid) setSessions(loadSessions(sid));
  }, []);

  const handleComplete = useCallback(
    (completedMode: "work" | "break") => {
      playBeep();
      const entry: Session = {
        date: todayStr(),
        minutes: completedMode === "work" ? WORK_MINUTES : BREAK_MINUTES,
        type: completedMode,
      };
      setSessions((prev) => {
        const next = [...prev, entry];
        if (studentId) saveSessions(studentId, next);
        return next;
      });
      // Switch mode
      const nextMode = completedMode === "work" ? "break" : "work";
      setMode(nextMode);
      setSecondsLeft(nextMode === "work" ? WORK_MINUTES * 60 : BREAK_MINUTES * 60);
      setRunning(false);
    },
    [studentId]
  );

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            handleComplete(mode);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, handleComplete]);

  function handleReset() {
    setRunning(false);
    setSecondsLeft(mode === "work" ? WORK_MINUTES * 60 : BREAK_MINUTES * 60);
  }

  const todaySessions = sessions.filter((s) => s.date === todayStr() && s.type === "work");
  const todayMinutes = todaySessions.reduce((a, s) => a + s.minutes, 0);
  const todayHours = Math.floor(todayMinutes / 60);
  const todayMins = todayMinutes % 60;
  const streak = computeStreak(sessions.filter((s) => s.type === "work"));

  const ringColor = mode === "work" ? "#6366f1" : "#10b981";
  const bgColor = mode === "work"
    ? "bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800"
    : "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800";

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Study Timer</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pomodoro technique — 25 min focus, 5 min break.
        </p>
      </div>

      {/* Timer card */}
      <Card>
        <div className={`rounded-xl border p-6 text-center ${bgColor}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
            {mode === "work" ? "Focus Session" : "Break Time"}
          </p>

          {/* Circular progress */}
          <div className="flex items-center justify-center mb-4">
            <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">
              {/* Background track */}
              <circle
                cx="64" cy="64" r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-slate-200 dark:text-slate-700"
              />
              {/* Progress arc */}
              <circle
                cx="64" cy="64" r="54"
                fill="none"
                stroke={ringColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 64 64)"
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
            {/* Time overlay */}
            <div className="absolute text-center pointer-events-none">
              <span className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {mins}:{secs}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setRunning((v) => !v)}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 text-sm font-semibold transition-colors shadow-sm"
            >
              {running ? "Pause" : "Start"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2.5 text-sm font-medium transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Mode toggle */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {(["work", "break"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  if (running) return;
                  setMode(m);
                  setSecondsLeft(m === "work" ? WORK_MINUTES * 60 : BREAK_MINUTES * 60);
                }}
                className={[
                  "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                  mode === m
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600",
                ].join(" ")}
              >
                {m === "work" ? "Work (25m)" : "Break (5m)"}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card padding="sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Today
          </p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {todayHours > 0 ? `${todayHours}h ` : ""}{todayMins}m studied
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {todaySessions.length} session{todaySessions.length !== 1 ? "s" : ""}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Study Streak
          </p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            🔥 {streak} day{streak !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">consecutive days</p>
        </Card>
      </div>

      {/* Session log */}
      {sessions.length > 0 && (
        <Card title="Recent Sessions">
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {[...sessions].reverse().slice(0, 20).map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0 text-sm">
                <div className="flex items-center gap-2">
                  <span>{s.type === "work" ? "📚" : "☕"}</span>
                  <span className="text-slate-700 dark:text-slate-300 capitalize">{s.type}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-xs">
                  <span>{s.minutes}m</span>
                  <span>{s.date}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
