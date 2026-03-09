"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Course, ScenarioConfig, SleepSchedule, StudyStrategy } from "@/lib/types";

interface ScenarioBuilderProps {
  studentId: number;
  courses: Course[];
  onRun: (config: ScenarioConfig) => Promise<void>;
  isLoading?: boolean;
  initialConfig?: Partial<ScenarioConfig>;
}

const STRATEGY_OPTIONS: { value: StudyStrategy; label: string; desc: string }[] = [
  { value: "spaced",   label: "Spaced",   desc: "Best for long-term retention" },
  { value: "mixed",    label: "Mixed",    desc: "Balance of deep & surface study" },
  { value: "cramming", label: "Cramming", desc: "High short-term, fast decay" },
];

const PRESETS: { label: string; desc: string; numWeeks: number; workHours: number; sleepHours: number; strategy: StudyStrategy }[] = [
  { label: "Light",      desc: "No job, full sleep",    numWeeks: 16, workHours: 0,  sleepHours: 8.0, strategy: "spaced"   },
  { label: "Standard",   desc: "Part-time, 7h sleep",   numWeeks: 16, workHours: 10, sleepHours: 7.0, strategy: "spaced"   },
  { label: "Working",    desc: "20h job, mixed study",  numWeeks: 16, workHours: 20, sleepHours: 7.0, strategy: "mixed"    },
  { label: "Overloaded", desc: "30h job, cramming",     numWeeks: 16, workHours: 30, sleepHours: 6.0, strategy: "cramming" },
];

function defaultExamWeeks(numWeeks: number): number[] {
  const midterm = Math.round(numWeeks / 2);
  return [midterm, numWeeks].filter((w, i, arr) => arr.indexOf(w) === i);
}

export function ScenarioBuilder({ studentId, courses, onRun, isLoading, initialConfig }: ScenarioBuilderProps) {
  const [numWeeks,          setNumWeeks]          = useState(initialConfig?.num_weeks             ?? 16);
  const [workHours,         setWorkHours]          = useState(initialConfig?.work_hours_per_week   ?? 10);
  const [sleepHours,        setSleepHours]         = useState(initialConfig?.sleep_target_hours    ?? 7.0);
  const [strategy,          setStrategy]           = useState<StudyStrategy>(initialConfig?.study_strategy ?? "spaced");
  const [selectedCourseIds, setSelectedCourseIds]  = useState<number[]>(
    initialConfig?.include_course_ids?.length
      ? initialConfig.include_course_ids
      : courses.map((c) => c.id)
  );
  const [scenarioName, setScenarioName] = useState(initialConfig?.scenario_name ?? "");
  const [examWeeks,    setExamWeeks]    = useState<number[]>(
    initialConfig?.exam_weeks ?? defaultExamWeeks(initialConfig?.num_weeks ?? 16)
  );

  // Advanced options
  const [showAdvanced,        setShowAdvanced]        = useState(false);
  const [extracurricularHours, setExtracurricularHours] = useState(initialConfig?.extracurricular_hours ?? 0);
  const [sleepSchedule,        setSleepSchedule]        = useState<SleepSchedule>(initialConfig?.sleep_schedule ?? "fixed");
  const [dropCourseId,         setDropCourseId]         = useState<number | null>(initialConfig?.drop_course_id ?? null);
  const [dropAtWeek,           setDropAtWeek]           = useState<number>(initialConfig?.drop_at_week ?? 8);

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setNumWeeks(preset.numWeeks);
    setWorkHours(preset.workHours);
    setSleepHours(preset.sleepHours);
    setStrategy(preset.strategy);
    setExamWeeks(defaultExamWeeks(preset.numWeeks));
    setScenarioName("");
  };

  const handleNumWeeksChange = (weeks: number) => {
    setNumWeeks(weeks);
    setExamWeeks(defaultExamWeeks(weeks));
  };

  const toggleExamWeek = (week: number) => {
    setExamWeeks((prev) =>
      prev.includes(week) ? prev.filter((w) => w !== week) : [...prev, week].sort((a, b) => a - b)
    );
  };

  const toggleCourse = (id: number) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const autoName = scenarioName.trim()
      || `${numWeeks}wk · ${workHours}h work · ${sleepHours}h sleep · ${strategy}`;
    await onRun({
      student_id:              studentId,
      num_weeks:               numWeeks,
      work_hours_per_week:     workHours,
      sleep_target_hours:      sleepHours,
      study_strategy:          strategy,
      include_course_ids:      selectedCourseIds,
      scenario_name:           autoName,
      exam_weeks:              examWeeks,
      extracurricular_hours:   extracurricularHours,
      sleep_schedule:          sleepSchedule,
      drop_course_id:          dropCourseId,
      drop_at_week:            dropCourseId ? dropAtWeek : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Presets */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Quick Presets</p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:border-brand-300 hover:bg-brand-50 transition-colors"
            >
              <p className="text-xs font-semibold text-slate-700">{p.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Scenario name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Scenario Name
          <span className="ml-1 text-xs font-normal text-slate-400">(auto-generated if blank)</span>
        </label>
        <input
          type="text"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          placeholder={`${numWeeks}wk · ${workHours}h work · ${strategy}`}
        />
      </div>

      {/* Semester length */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Semester Length: <span className="font-semibold text-brand-600">{numWeeks} weeks</span>
        </label>
        <input type="range" min={4} max={20} step={1} value={numWeeks}
          aria-label="Semester length in weeks"
          onChange={(e) => handleNumWeeksChange(parseInt(e.target.value))}
          className="w-full accent-brand-600" />
        <div className="flex justify-between text-xs text-slate-400 mt-1"><span>4 wks</span><span>20 wks</span></div>
      </div>

      {/* Work hours */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Weekly Work Hours: <span className="font-semibold text-brand-600">{workHours}h</span>
        </label>
        <input type="range" min={0} max={60} step={1} value={workHours}
          aria-label="Weekly work hours"
          onChange={(e) => setWorkHours(parseInt(e.target.value))}
          className="w-full accent-brand-600" />
        <div className="flex justify-between text-xs text-slate-400 mt-1"><span>0h</span><span>60h</span></div>
      </div>

      {/* Sleep */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Sleep Target: <span className="font-semibold text-brand-600">{sleepHours}h/night</span>
        </label>
        <input type="range" min={4} max={12} step={0.5} value={sleepHours}
          aria-label="Sleep target hours per night"
          onChange={(e) => setSleepHours(parseFloat(e.target.value))}
          className="w-full accent-brand-600" />
        <div className="flex justify-between text-xs text-slate-400 mt-1"><span>4h</span><span>12h</span></div>
      </div>

      {/* Study strategy */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Study Strategy</label>
        <div className="grid grid-cols-3 gap-2">
          {STRATEGY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStrategy(opt.value)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                strategy === opt.value
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Exam weeks */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Exam Weeks{" "}
          <span className="text-xs font-normal text-slate-400">(1.3× load · reduced recovery)</span>
        </label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {Array.from({ length: numWeeks }, (_, i) => i + 1).map((w) => {
            const active = examWeeks.includes(w);
            return (
              <button
                key={w}
                type="button"
                onClick={() => toggleExamWeek(w)}
                className={`rounded-lg px-2 py-0.5 text-xs font-medium transition-colors border ${
                  active
                    ? "bg-red-50 text-red-700 border-red-300"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                W{w}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          {examWeeks.length === 0
            ? "No exam weeks — uniform pressure"
            : `Exam weeks: ${examWeeks.map((w) => `W${w}`).join(", ")}`}
        </p>
      </div>

      {/* Courses */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Courses <span className="text-slate-400 font-normal">({selectedCourseIds.length} selected)</span>
        </label>
        <div className="space-y-2">
          {courses.map((course) => (
            <label key={course.id} className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={selectedCourseIds.includes(course.id)}
                onChange={() => toggleCourse(course.id)}
                className="accent-brand-600"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{course.name}</p>
                <p className="text-xs text-slate-400">{course.credits} cr · Difficulty {course.difficulty_score}/10</p>
              </div>
            </label>
          ))}
        </div>
        {courses.length === 0 && (
          <p className="text-sm text-slate-400 italic">No courses yet — add them in your profile.</p>
        )}
      </div>

      {/* ── Advanced Options ─────────────────────────────────────── */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"
        >
          <span>Advanced Options</span>
          <span className="text-slate-400">{showAdvanced ? "▲" : "▼"}</span>
        </button>

        {showAdvanced && (
          <div className="px-4 py-4 space-y-5 bg-white">
            {/* Extracurricular hours */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Extracurricular Hours/Week:{" "}
                <span className="font-semibold text-brand-600">{extracurricularHours}h</span>
              </label>
              <input
                type="range" min={0} max={20} step={1} value={extracurricularHours}
                aria-label="Extracurricular hours per week"
                onChange={(e) => setExtracurricularHours(parseInt(e.target.value))}
                className="w-full accent-brand-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1"><span>0h</span><span>20h</span></div>
              <p className="text-xs text-slate-400 mt-1">Clubs, sports, Greek life — reduces available study time.</p>
            </div>

            {/* Sleep schedule */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Sleep Schedule</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "fixed" as SleepSchedule, label: "Fixed", desc: `${sleepHours}h every night` },
                  { value: "variable" as SleepSchedule, label: "Variable", desc: "6.5h weekdays, 9h weekends" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSleepSchedule(opt.value)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      sleepSchedule === opt.value
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Course drop */}
            {courses.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Drop a Course Mid-Semester
                  <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={dropCourseId ?? ""}
                    onChange={(e) => setDropCourseId(e.target.value ? parseInt(e.target.value) : null)}
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">— No drop —</option>
                    {courses
                      .filter((c) => selectedCourseIds.includes(c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                  {dropCourseId && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-500 whitespace-nowrap">After week</label>
                      <input
                        type="number" min={1} max={numWeeks - 1} value={dropAtWeek}
                        onChange={(e) => setDropAtWeek(parseInt(e.target.value))}
                        className="w-16 rounded-xl border border-slate-300 px-2 py-2 text-sm text-center focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
                {dropCourseId && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    Course dropped after week {dropAtWeek} — freed study time redistributed to remaining courses.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedCourseIds.length === 0 && courses.length > 0 && (
        <p className="text-xs text-amber-600 text-center">Select at least one course to run a simulation.</p>
      )}

      <Button type="submit" isLoading={isLoading} className="w-full" size="lg"
        disabled={selectedCourseIds.length === 0}>
        Run Simulation
      </Button>
    </form>
  );
}
