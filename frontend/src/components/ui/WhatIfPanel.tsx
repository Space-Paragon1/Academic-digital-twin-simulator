"use client";

import { useState } from "react";
import { Card } from "./Card";

interface WhatIfPanelProps {
  baseGpa: number;
  baseBurnout: number;
  baseSleep: number;
  baseWork: number;
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function estimateGpa(sleep: number, work: number, baseGpa: number): number {
  // Heuristic: each missing hour of sleep (vs 8h) costs 0.03 GPA, each extra work hour > 20 costs 0.01
  const sleepPenalty = clamp((8 - sleep) * 0.03, 0, 0.5);
  const workPenalty = clamp(Math.max(0, work - 20) * 0.01, 0, 0.4);
  return clamp(baseGpa - sleepPenalty - workPenalty, 0, 4.0);
}

function estimateBurnout(sleep: number, work: number): number {
  // Heuristic: less sleep + more work → higher burnout
  const sleepFactor = clamp((8 - sleep) / 4, 0, 1);
  const workFactor = clamp(work / 40, 0, 1);
  return clamp((sleepFactor * 0.5 + workFactor * 0.5) * 100, 0, 100);
}

function riskLabel(pct: number): { label: string; color: string } {
  if (pct >= 60) return { label: "HIGH", color: "text-red-600 dark:text-red-400" };
  if (pct >= 30) return { label: "MEDIUM", color: "text-amber-600 dark:text-amber-400" };
  return { label: "LOW", color: "text-green-600 dark:text-green-400" };
}

export function WhatIfPanel({ baseGpa, baseBurnout, baseSleep, baseWork }: WhatIfPanelProps) {
  const [sleep, setSleep] = useState(baseSleep);
  const [work, setWork]   = useState(baseWork);

  const estGpa     = estimateGpa(sleep, work, baseGpa);
  const estBurnout = estimateBurnout(sleep, work);
  const risk       = riskLabel(estBurnout);
  const gpaChange  = estGpa - baseGpa;
  const burnChange = estBurnout - baseBurnout;

  return (
    <Card title="What-If Explorer" subtitle="Rough estimates — adjust sliders to preview impact">
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">Sleep target</span>
            <span className="font-semibold text-brand-600">{sleep.toFixed(1)}h / night</span>
          </div>
          <input
            type="range" min={4} max={10} step={0.5} value={sleep}
            onChange={(e) => setSleep(parseFloat(e.target.value))}
            className="w-full accent-brand-600"
            aria-label="Sleep hours"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-0.5"><span>4h</span><span>10h</span></div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">Work hours / week</span>
            <span className="font-semibold text-brand-600">{work}h</span>
          </div>
          <input
            type="range" min={0} max={40} step={1} value={work}
            onChange={(e) => setWork(parseInt(e.target.value))}
            className="w-full accent-brand-600"
            aria-label="Work hours per week"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-0.5"><span>0h</span><span>40h</span></div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Est. GPA</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{estGpa.toFixed(2)}</p>
            {gpaChange !== 0 && (
              <p className={`text-xs font-semibold mt-0.5 ${gpaChange > 0 ? "text-green-500" : "text-red-500"}`}>
                {gpaChange > 0 ? "+" : ""}{gpaChange.toFixed(2)} vs base
              </p>
            )}
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Burnout Risk</p>
            <p className={`text-2xl font-bold ${risk.color}`}>{risk.label}</p>
            <p className={`text-xs font-semibold mt-0.5 ${burnChange > 0 ? "text-red-400" : "text-green-500"}`}>
              {estBurnout.toFixed(0)}%
              {burnChange !== 0 && ` (${burnChange > 0 ? "+" : ""}${burnChange.toFixed(0)} vs base)`}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
          These are rough estimates. Run a full simulation for accurate predictions.
        </p>
      </div>
    </Card>
  );
}
