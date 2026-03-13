"use client";

import type { SimulationResult } from "@/lib/types";

interface ScenarioDiffProps {
  a: SimulationResult;
  b: SimulationResult;
}

type ChangeDir = "better" | "worse" | "same";

function deltaColor(dir: ChangeDir): string {
  if (dir === "better") return "text-green-600 dark:text-green-400";
  if (dir === "worse")  return "text-red-500 dark:text-red-400";
  return "text-slate-400 dark:text-slate-500";
}

function deltaBg(dir: ChangeDir): string {
  if (dir === "better") return "bg-green-50 dark:bg-green-900/20";
  if (dir === "worse")  return "bg-red-50 dark:bg-red-900/20";
  return "";
}

interface DiffRow {
  param: string;
  valA: string;
  valB: string;
  changeLabel: string;
  dir: ChangeDir;
}

function scenarioLabel(sim: SimulationResult): string {
  return sim.scenario_config.scenario_name ?? `Scenario #${sim.id ?? "?"}`;
}

function computeOverallWinner(a: SimulationResult, b: SimulationResult): "A" | "B" | "tie" {
  let scoreA = 0;
  let scoreB = 0;
  if (a.summary.predicted_gpa_mean > b.summary.predicted_gpa_mean) scoreA++;
  else if (b.summary.predicted_gpa_mean > a.summary.predicted_gpa_mean) scoreB++;
  if (a.summary.burnout_probability < b.summary.burnout_probability) scoreA++;
  else if (b.summary.burnout_probability < a.summary.burnout_probability) scoreB++;
  if (scoreA > scoreB) return "A";
  if (scoreB > scoreA) return "B";
  return "tie";
}

export function ScenarioDiff({ a, b }: ScenarioDiffProps) {
  const gpaA = a.summary.predicted_gpa_mean;
  const gpaB = b.summary.predicted_gpa_mean;
  const gpaDiff = gpaB - gpaA;

  const burnA = a.summary.burnout_risk;
  const burnB = b.summary.burnout_risk;
  const burnOrderMap: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  const burnDiff = (burnOrderMap[burnB] ?? 1) - (burnOrderMap[burnA] ?? 1);

  const sleepA = a.scenario_config.sleep_target_hours;
  const sleepB = b.scenario_config.sleep_target_hours;
  const sleepDiff = sleepB - sleepA;

  const workA = a.scenario_config.work_hours_per_week;
  const workB = b.scenario_config.work_hours_per_week;
  const workDiff = workB - workA;

  const studyA = a.scenario_config.study_strategy;
  const studyB = b.scenario_config.study_strategy;

  const studyHoursA = a.summary.required_study_hours_per_week;
  const studyHoursB = b.summary.required_study_hours_per_week;
  const studyHoursDiff = studyHoursB - studyHoursA;

  const deficitA = a.summary.sleep_deficit_hours;
  const deficitB = b.summary.sleep_deficit_hours;
  const deficitDiff = deficitB - deficitA;

  const rows: DiffRow[] = [
    {
      param: "Predicted GPA",
      valA: gpaA.toFixed(2),
      valB: gpaB.toFixed(2),
      changeLabel:
        Math.abs(gpaDiff) < 0.005
          ? "—"
          : `${gpaDiff > 0 ? "+" : ""}${gpaDiff.toFixed(2)} ${gpaDiff > 0 ? "↑" : "↓"}`,
      dir: Math.abs(gpaDiff) < 0.005 ? "same" : gpaDiff > 0 ? "better" : "worse",
    },
    {
      param: "Burnout Risk",
      valA: burnA,
      valB: burnB,
      changeLabel:
        burnDiff === 0
          ? "—"
          : burnDiff < 0
          ? "↓ Better"
          : "↑ Worse",
      dir: burnDiff === 0 ? "same" : burnDiff < 0 ? "better" : "worse",
    },
    {
      param: "Burnout Probability",
      valA: `${(a.summary.burnout_probability * 100).toFixed(0)}%`,
      valB: `${(b.summary.burnout_probability * 100).toFixed(0)}%`,
      changeLabel: (() => {
        const d = (b.summary.burnout_probability - a.summary.burnout_probability) * 100;
        if (Math.abs(d) < 0.5) return "—";
        return `${d > 0 ? "+" : ""}${d.toFixed(0)}% ${d > 0 ? "↑" : "↓"}`;
      })(),
      dir: (() => {
        const d = b.summary.burnout_probability - a.summary.burnout_probability;
        if (Math.abs(d) < 0.005) return "same";
        return d < 0 ? "better" : "worse";
      })(),
    },
    {
      param: "Sleep Target",
      valA: `${sleepA}h`,
      valB: `${sleepB}h`,
      changeLabel: Math.abs(sleepDiff) < 0.05 ? "—" : `${sleepDiff > 0 ? "+" : ""}${sleepDiff.toFixed(1)}h`,
      dir: Math.abs(sleepDiff) < 0.05 ? "same" : sleepDiff > 0 ? "better" : "worse",
    },
    {
      param: "Work Hours",
      valA: `${workA}h`,
      valB: `${workB}h`,
      changeLabel: Math.abs(workDiff) < 0.05 ? "—" : `${workDiff > 0 ? "+" : ""}${workDiff.toFixed(0)}h`,
      dir: Math.abs(workDiff) < 0.05 ? "same" : workDiff < 0 ? "better" : "worse",
    },
    {
      param: "Study Strategy",
      valA: studyA,
      valB: studyB,
      changeLabel: studyA === studyB ? "—" : "Changed",
      dir: "same",
    },
    {
      param: "Study Hours/Wk",
      valA: `${studyHoursA.toFixed(1)}h`,
      valB: `${studyHoursB.toFixed(1)}h`,
      changeLabel:
        Math.abs(studyHoursDiff) < 0.05
          ? "—"
          : `${studyHoursDiff > 0 ? "+" : ""}${studyHoursDiff.toFixed(1)}h`,
      dir: "same",
    },
    {
      param: "Sleep Deficit",
      valA: `${deficitA.toFixed(1)}h`,
      valB: `${deficitB.toFixed(1)}h`,
      changeLabel:
        Math.abs(deficitDiff) < 0.05
          ? "—"
          : `${deficitDiff > 0 ? "+" : ""}${deficitDiff.toFixed(1)}h ${deficitDiff < 0 ? "↓ better" : "↑ worse"}`,
      dir: Math.abs(deficitDiff) < 0.05 ? "same" : deficitDiff < 0 ? "better" : "worse",
    },
  ];

  const winner = computeOverallWinner(a, b);
  const labelA = scenarioLabel(a);
  const labelB = scenarioLabel(b);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Winner banner */}
      <div
        className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
          winner === "tie"
            ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            : winner === "A"
            ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
            : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
        }`}
      >
        <span className="text-base">
          {winner === "tie" ? "🤝" : winner === "A" ? "🏆" : "🏆"}
        </span>
        {winner === "tie"
          ? "Both scenarios are equally balanced."
          : winner === "A"
          ? `Overall winner: ${labelA} — higher GPA or lower burnout.`
          : `Overall winner: ${labelB} — higher GPA or lower burnout.`}
      </div>

      {/* Diff table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Parameter
              </th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                {labelA}
              </th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                {labelB}
              </th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.param}
                className={`border-b border-slate-100 dark:border-slate-800 last:border-0 ${deltaBg(row.dir)}`}
              >
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                  {row.param}
                </td>
                <td className="px-4 py-2.5 text-center font-semibold text-slate-800 dark:text-slate-200">
                  {row.valA}
                </td>
                <td className="px-4 py-2.5 text-center font-semibold text-slate-800 dark:text-slate-200">
                  {row.valB}
                </td>
                <td className={`px-4 py-2.5 text-center font-semibold text-xs ${deltaColor(row.dir)}`}>
                  {row.changeLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
