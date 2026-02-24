"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Course, ScenarioConfig, StudyStrategy } from "@/lib/types";

interface ScenarioBuilderProps {
  studentId: number;
  courses: Course[];
  onRun: (config: ScenarioConfig) => Promise<void>;
  isLoading?: boolean;
}

const STRATEGY_OPTIONS: { value: StudyStrategy; label: string; desc: string }[] = [
  { value: "spaced", label: "Spaced", desc: "Best for long-term retention" },
  { value: "mixed", label: "Mixed", desc: "Balance of deep & surface study" },
  { value: "cramming", label: "Cramming", desc: "High short-term, fast decay" },
];

function defaultExamWeeks(numWeeks: number): number[] {
  const midterm = Math.round(numWeeks / 2);
  return [midterm, numWeeks].filter((w, i, arr) => arr.indexOf(w) === i);
}

export function ScenarioBuilder({ studentId, courses, onRun, isLoading }: ScenarioBuilderProps) {
  const [numWeeks, setNumWeeks] = useState(16);
  const [workHours, setWorkHours] = useState(10);
  const [sleepHours, setSleepHours] = useState(7.0);
  const [strategy, setStrategy] = useState<StudyStrategy>("spaced");
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>(courses.map((c) => c.id));
  const [scenarioName, setScenarioName] = useState("");
  const [examWeeks, setExamWeeks] = useState<number[]>(defaultExamWeeks(16));

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
    await onRun({
      student_id: studentId,
      num_weeks: numWeeks,
      work_hours_per_week: workHours,
      sleep_target_hours: sleepHours,
      study_strategy: strategy,
      include_course_ids: selectedCourseIds,
      scenario_name: scenarioName || undefined,
      exam_weeks: examWeeks,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Scenario Name (optional)</label>
        <input
          type="text"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="e.g. 18 Credits + Part-time Job"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Semester Length: <span className="font-semibold text-brand-600">{numWeeks} weeks</span>
        </label>
        <input type="range" min={4} max={20} step={1} value={numWeeks}
          onChange={(e) => handleNumWeeksChange(parseInt(e.target.value))} className="w-full accent-brand-600" />
        <div className="flex justify-between text-xs text-gray-400 mt-1"><span>4 wks</span><span>20 wks</span></div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Weekly Work Hours: <span className="font-semibold text-brand-600">{workHours}h</span>
        </label>
        <input type="range" min={0} max={60} step={1} value={workHours}
          onChange={(e) => setWorkHours(parseInt(e.target.value))} className="w-full accent-brand-600" />
        <div className="flex justify-between text-xs text-gray-400 mt-1"><span>0h</span><span>60h</span></div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sleep Target: <span className="font-semibold text-brand-600">{sleepHours}h/night</span>
        </label>
        <input type="range" min={4} max={12} step={0.5} value={sleepHours}
          onChange={(e) => setSleepHours(parseFloat(e.target.value))} className="w-full accent-brand-600" />
        <div className="flex justify-between text-xs text-gray-400 mt-1"><span>4h</span><span>12h</span></div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Study Strategy</label>
        <div className="grid grid-cols-3 gap-2">
          {STRATEGY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStrategy(opt.value)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                strategy === opt.value
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Exam weeks picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Exam Weeks{" "}
          <span className="text-xs font-normal text-gray-500">
            (1.3× load · reduced recovery time)
          </span>
        </label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {Array.from({ length: numWeeks }, (_, i) => i + 1).map((w) => {
            const active = examWeeks.includes(w);
            return (
              <button
                key={w}
                type="button"
                onClick={() => toggleExamWeek(w)}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-red-100 text-red-700 border border-red-300"
                    : "bg-gray-100 text-gray-500 border border-gray-200 hover:border-gray-300"
                }`}
              >
                W{w}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          {examWeeks.length === 0
            ? "No exam weeks — uniform pressure all semester"
            : `Exam weeks: ${examWeeks.map((w) => `W${w}`).join(", ")}`}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Courses ({selectedCourseIds.length} selected)
        </label>
        <div className="space-y-2">
          {courses.map((course) => (
            <label key={course.id} className="flex items-center gap-3 cursor-pointer rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selectedCourseIds.includes(course.id)}
                onChange={() => toggleCourse(course.id)}
                className="accent-brand-600"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{course.name}</p>
                <p className="text-xs text-gray-500">{course.credits} cr · Difficulty {course.difficulty_score}/10</p>
              </div>
            </label>
          ))}
        </div>
        {courses.length === 0 && (
          <p className="text-sm text-gray-500 italic">No courses yet — add courses in your profile.</p>
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
