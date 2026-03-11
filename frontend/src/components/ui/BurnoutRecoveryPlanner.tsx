"use client";

interface BurnoutRecoveryPlannerProps {
  burnoutProbability: number;
  currentWork: number;
  currentSleep: number;
}

export function BurnoutRecoveryPlanner({
  burnoutProbability,
  currentWork,
  currentSleep,
}: BurnoutRecoveryPlannerProps) {
  if (burnoutProbability < 0.6) return null;

  const suggestedWork = Math.min(currentWork, 15);
  const workReduction = Math.max(currentWork - suggestedWork, 0);
  const sleepTarget = Math.max(currentSleep, 8);
  const sleepIncrease = sleepTarget - currentSleep;

  const tips: string[] = [];
  if (workReduction > 0) {
    tips.push(`Reduce paid/work hours by ${workReduction.toFixed(0)}h this week — aim for a maximum of ${suggestedWork}h.`);
  }
  if (sleepIncrease > 0) {
    tips.push(`Increase nightly sleep by ~${(sleepIncrease / 7).toFixed(1)}h to reach ${sleepTarget}h/night target.`);
  } else {
    tips.push(`Maintain your ${currentSleep}h sleep target — consistency matters more than total hours.`);
  }
  if (currentWork > 20) {
    tips.push("Consider asking your employer for fewer shifts during exam weeks.");
  }
  tips.push("Schedule at least one full rest day (no studying, no work) each week.");

  return (
    <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">🔥</span>
        <div>
          <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
            High Burnout Risk — 2-Week Recovery Plan
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            Burnout probability is <strong>{(burnoutProbability * 100).toFixed(0)}%</strong>. Follow this plan to recover and protect your GPA.
          </p>
        </div>
      </div>

      {/* Week 1 */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-white/60 dark:bg-slate-900/40 p-4 space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
          Week 1 — Reduce Load
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Cut work hours to <strong>{suggestedWork}h/week</strong>
          {workReduction > 0 && ` (−${workReduction.toFixed(0)}h from current ${currentWork}h)`}.
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Target sleep: <strong>{sleepTarget}h/night</strong>
          {sleepIncrease > 0 && ` (+${sleepIncrease.toFixed(1)}h total vs current)`}.
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Limit deep study sessions to <strong>45-minute blocks</strong> with 15-minute breaks.
        </p>
      </div>

      {/* Week 2 */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-white/60 dark:bg-slate-900/40 p-4 space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
          Week 2 — Gradual Return
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Increase work hours by <strong>no more than 3h</strong> from Week 1 level.
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Maintain <strong>{sleepTarget}h sleep</strong> — do not sacrifice sleep to catch up.
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Re-introduce spaced repetition study (use "spaced" strategy in next simulation).
        </p>
      </div>

      {/* Actionable tips */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300 mb-2">
          Specific Action Steps
        </p>
        <ul className="space-y-1.5">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-amber-400 dark:bg-amber-600 flex items-center justify-center text-[10px] font-bold text-white">
                {i + 1}
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300">{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
