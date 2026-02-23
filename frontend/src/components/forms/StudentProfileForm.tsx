"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Student, StudentCreate } from "@/lib/types";

interface StudentProfileFormProps {
  initial?: Student;
  onSubmit: (data: StudentCreate) => Promise<void>;
  isLoading?: boolean;
}

export function StudentProfileForm({ initial, onSubmit, isLoading }: StudentProfileFormProps) {
  const [form, setForm] = useState<StudentCreate>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    target_gpa: initial?.target_gpa ?? 3.5,
    weekly_work_hours: initial?.weekly_work_hours ?? 0,
    sleep_target_hours: initial?.sleep_target_hours ?? 7,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="Alex Umeasalugo"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="alex@university.edu"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target GPA: <span className="font-semibold text-brand-600">{form.target_gpa.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={0.0}
          max={4.0}
          step={0.1}
          value={form.target_gpa}
          onChange={(e) => setForm({ ...form, target_gpa: parseFloat(e.target.value) })}
          className="w-full accent-brand-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0.0</span><span>4.0</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Weekly Work Hours: <span className="font-semibold text-brand-600">{form.weekly_work_hours}h</span>
        </label>
        <input
          type="range"
          min={0}
          max={60}
          step={1}
          value={form.weekly_work_hours}
          onChange={(e) => setForm({ ...form, weekly_work_hours: parseInt(e.target.value) })}
          className="w-full accent-brand-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0h</span><span>60h</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sleep Target (hours/night): <span className="font-semibold text-brand-600">{form.sleep_target_hours}h</span>
        </label>
        <input
          type="range"
          min={4}
          max={12}
          step={0.5}
          value={form.sleep_target_hours}
          onChange={(e) => setForm({ ...form, sleep_target_hours: parseFloat(e.target.value) })}
          className="w-full accent-brand-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>4h</span><span>12h</span>
        </div>
      </div>

      <Button type="submit" isLoading={isLoading} className="w-full">
        {initial ? "Update Profile" : "Create Profile"}
      </Button>
    </form>
  );
}
