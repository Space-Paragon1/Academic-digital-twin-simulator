"use client";

interface Props {
  totalCredits: number;
  workHours: number;
  sleepHours: number;
  numCourses: number;
}

export function CourseLoadAdvisor({ totalCredits, workHours, sleepHours, numCourses }: Props) {
  // Carnegie Rule: 1 credit = 2.5 study hours/week
  const requiredStudy = totalCredits * 2.5;

  // Available hours: 168 total - (sleep * 7 days) - work - 21 (meals/hygiene) - 10 (commute/misc)
  const available = 168 - sleepHours * 7 - workHours - 21 - 10;
  const surplus = available - requiredStudy;

  let severity: "ok" | "warn" | "critical" = "ok";
  if (surplus < -15) severity = "critical";
  else if (surplus < -5) severity = "warn";
  else if (surplus >= 10) severity = "ok";

  const cardStyles = {
    ok: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10 text-green-800 dark:text-green-300",
    warn: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10 text-amber-800 dark:text-amber-300",
    critical: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10 text-red-800 dark:text-red-300",
  };

  const icon = {
    ok: "✅",
    warn: "⚠️",
    critical: "🚨",
  };

  const message = {
    ok: `Schedule looks sustainable. You have ~${surplus.toFixed(0)}h/week of free time.`,
    warn: `Slightly overloaded — ${Math.abs(surplus).toFixed(0)}h/week deficit. Consider reducing work or courses.`,
    critical: `Critically overloaded — ${Math.abs(surplus).toFixed(0)}h/week deficit. Drop a course or cut work hours.`,
  };

  if (totalCredits === 0) return null;

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm mb-4 ${cardStyles[severity]}`}>
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className="text-base leading-5 shrink-0">{icon[severity]}</span>
        <div className="min-w-0">
          <p className="font-semibold leading-snug">
            Course Load Advisor — {numCourses} course{numCourses !== 1 ? "s" : ""} / {totalCredits} credits
          </p>
          <p className="mt-0.5 opacity-90">{message[severity]}</p>
          <div className="mt-1.5 flex flex-wrap gap-3 text-xs opacity-75">
            <span>Required study: <strong>{requiredStudy.toFixed(0)}h/wk</strong></span>
            <span>Available: <strong>{Math.max(available, 0).toFixed(0)}h/wk</strong></span>
            <span>Sleep: <strong>{(sleepHours * 7).toFixed(0)}h/wk</strong></span>
            <span>Work: <strong>{workHours}h/wk</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
