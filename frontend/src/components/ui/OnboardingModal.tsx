"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const ONBOARDING_KEY = "adt_onboarding_done";
const STUDENT_ID_KEY = "adt_student_id";

const STEPS = [
  {
    emoji: "🎓",
    title: "Welcome to Academic Digital Twin",
    description:
      "This simulator models your academic life as a dynamic system — predicting your GPA, burnout risk, and cognitive load week-by-week so you can plan smarter.",
  },
  {
    emoji: "👤",
    title: "Step 1 — Create Your Profile",
    description:
      "Go to Profile to set your name, target GPA, and sleep/work preferences. Then add your courses — or import them from Canvas LMS with one click.",
  },
  {
    emoji: "🧪",
    title: "Step 2 — Run a Scenario",
    description:
      "Head to Scenarios and configure a simulation: semester length, study strategy (spaced, mixed, cramming), work hours, sleep, and exam weeks. Hit Run.",
  },
  {
    emoji: "🤖",
    title: "Step 3 — Ask the AI Advisor",
    description:
      "Your AI Advisor can answer questions like \"What if I drop a course?\" or \"How can I raise my GPA by 0.3?\". It uses your simulation data to give personalised advice.",
  },
  {
    emoji: "🚀",
    title: "You're all set!",
    description:
      "Your Dashboard shows live GPA trajectory, burnout gauge, and goal progress. Use the Optimizer to find the best schedule. Let's get started!",
  },
];

export function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    const hasStudent = !!parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0");
    if (!done && !hasStudent) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome onboarding"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 p-6 animate-in slide-in-from-bottom-4 duration-300">
        {/* Progress dots */}
        <div className="flex gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to step ${i + 1}`}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === step
                  ? "w-6 bg-brand-600"
                  : i < step
                  ? "w-3 bg-brand-300"
                  : "w-3 bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Illustration emoji */}
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 mb-4 text-4xl">
          {current.emoji}
        </div>

        {/* Content */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
          {current.title}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {current.description}
        </p>

        {/* Step indicator */}
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
          Step {step + 1} of {STEPS.length}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between mt-5 gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setStep((s) => s - 1)}>
                Previous
              </Button>
            )}
            {isLast ? (
              <Link href="/profile" onClick={dismiss}>
                <Button size="sm">Done</Button>
              </Link>
            ) : (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
