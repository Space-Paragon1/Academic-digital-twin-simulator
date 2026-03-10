"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const ONBOARDING_KEY = "adt_onboarding_done";
const STUDENT_ID_KEY = "adt_student_id";

const STEPS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-brand-600" aria-hidden="true">
        <path d="M12 3L3 8v8l9 5 9-5V8L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M12 12v9M3 8l9 4 9-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeOpacity="0.6"/>
      </svg>
    ),
    title: "Welcome to Academic Digital Twin",
    body: "This simulator models your academic life as a dynamic system — predicting your GPA, burnout risk, and cognitive load week-by-week so you can plan smarter.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-brand-600" aria-hidden="true">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    title: "Step 1 — Create Your Profile",
    body: "Go to Profile to set your name, target GPA, and sleep/work preferences. Then add your courses — or import them from Canvas LMS with one click.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-brand-600" aria-hidden="true">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Step 2 — Run a Scenario",
    body: "Head to Scenarios and configure a simulation: semester length, study strategy (spaced, mixed, cramming), work hours, sleep, and exam weeks. Hit Run.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-brand-600" aria-hidden="true">
        <path d="M3 12l9-9 9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Step 3 — Analyse & Optimise",
    body: "Your Dashboard shows live GPA trajectory, burnout gauge, and goal progress. Use the Optimizer to find the best schedule, and the AI Advisor to ask questions in plain English.",
  },
];

export function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    const hasStudent = !!parseInt(localStorage.getItem(STUDENT_ID_KEY) ?? "0");
    if (!done && !hasStudent) {
      // Small delay so the page layout settles first
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

        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/20 mb-4">
          {current.icon}
        </div>

        {/* Content */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
          {current.title}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {current.body}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 gap-3">
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
                Back
              </Button>
            )}
            {isLast ? (
              <Link href="/profile" onClick={dismiss}>
                <Button size="sm">Get Started</Button>
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
