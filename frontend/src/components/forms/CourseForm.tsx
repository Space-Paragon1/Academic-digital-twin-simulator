"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { CourseCreate } from "@/lib/types";

interface CourseFormProps {
  onSubmit: (data: CourseCreate) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const DEFAULT_ASSESSMENT = { assignments: 0.3, midterm: 0.3, final: 0.4 };

export function CourseForm({ onSubmit, onCancel, isLoading }: CourseFormProps) {
  const [form, setForm] = useState<CourseCreate>({
    name: "",
    credits: 3,
    difficulty_score: 5,
    weekly_workload_hours: 3,
    assessment_structure: DEFAULT_ASSESSMENT,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
    setForm({ name: "", credits: 3, difficulty_score: 5, weekly_workload_hours: 3, assessment_structure: DEFAULT_ASSESSMENT });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="e.g. Data Structures"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Credits</label>
          <select
            value={form.credits}
            onChange={(e) => setForm({ ...form, credits: parseInt(e.target.value) })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            {[1, 2, 3, 4, 5, 6].map((c) => (
              <option key={c} value={c}>{c} credits</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Est. Weekly Hours: <span className="font-semibold text-brand-600">{form.weekly_workload_hours}h</span>
          </label>
          <input
            type="range"
            min={0.5}
            max={20}
            step={0.5}
            value={form.weekly_workload_hours}
            onChange={(e) => setForm({ ...form, weekly_workload_hours: parseFloat(e.target.value) })}
            className="w-full accent-brand-600 mt-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Difficulty: <span className="font-semibold text-brand-600">{form.difficulty_score}/10</span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={form.difficulty_score}
          onChange={(e) => setForm({ ...form, difficulty_score: parseFloat(e.target.value) })}
          className="w-full accent-brand-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Easy</span><span>Moderate</span><span>Very Hard</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" isLoading={isLoading} size="sm">
          Add Course
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
