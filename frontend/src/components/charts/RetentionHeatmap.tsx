"use client";

import type { WeeklySnapshot } from "@/lib/types";

interface RetentionHeatmapProps {
  snapshots: WeeklySnapshot[];
}

/** Interpolate between red→yellow→green for a 0-1 retention value. */
function retentionColor(value: number): string {
  // < 0.4 → red zone, 0.4–0.7 → amber zone, > 0.7 → green zone
  if (value >= 0.7) {
    // amber → green
    const t = Math.min(1, (value - 0.7) / 0.3);
    const r = Math.round(245 - t * (245 - 34));
    const g = Math.round(158 + t * (197 - 158));
    const b = Math.round(11 + t * (94 - 11));
    return `rgb(${r},${g},${b})`;
  }
  if (value >= 0.4) {
    // red → amber
    const t = (value - 0.4) / 0.3;
    const r = Math.round(239 - t * (239 - 245));
    const g = Math.round(68 + t * (158 - 68));
    const b = Math.round(68 - t * (68 - 11));
    return `rgb(${r},${g},${b})`;
  }
  // below 0.4 → solid red
  return "rgb(239,68,68)";
}

function textColor(value: number): string {
  return value > 0.55 ? "#14532d" : value > 0.35 ? "#78350f" : "#7f1d1d";
}

export function RetentionHeatmap({ snapshots }: RetentionHeatmapProps) {
  if (!snapshots.length) return null;

  // Collect all course names from the first snapshot that has retentions
  const firstWithRetention = snapshots.find(
    (s) => s.course_retentions && Object.keys(s.course_retentions).length > 0
  );
  if (!firstWithRetention) return null;

  const courses = Object.keys(firstWithRetention.course_retentions).sort();

  // Limit display to 20 weeks max to keep grid compact
  const displaySnaps = snapshots.length > 20
    ? snapshots.filter((_, i) => i % Math.ceil(snapshots.length / 20) === 0 || i === snapshots.length - 1)
    : snapshots;

  const cellW = Math.max(28, Math.min(48, Math.floor(560 / displaySnaps.length)));

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: courses.length > 0 ? 200 + displaySnaps.length * cellW : "auto" }}>
        {/* Header row — week numbers */}
        <div className="flex items-center mb-1" style={{ paddingLeft: 152 }}>
          {displaySnaps.map((s) => (
            <div
              key={s.week}
              style={{ width: cellW, flexShrink: 0 }}
              className={`text-center text-[10px] font-medium leading-none py-0.5 ${
                s.is_exam_week ? "text-red-600 font-bold" : "text-slate-400"
              }`}
            >
              W{s.week}
              {s.is_exam_week && <span className="block text-[8px]">★</span>}
            </div>
          ))}
          {/* Legend */}
          <div className="ml-4 flex items-center gap-1 shrink-0">
            {[0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
              <div
                key={v}
                style={{ background: retentionColor(v), width: 14, height: 14, borderRadius: 3 }}
                title={`${(v * 100).toFixed(0)}%`}
              />
            ))}
            <span className="text-[10px] text-slate-400 ml-1">Low → High</span>
          </div>
        </div>

        {/* Course rows */}
        <div className="space-y-0.5">
          {courses.map((course) => (
            <div key={course} className="flex items-center">
              {/* Course name */}
              <div
                className="text-xs text-slate-600 font-medium truncate shrink-0 pr-2 text-right"
                style={{ width: 148 }}
                title={course}
              >
                {course}
              </div>

              {/* Cells */}
              {displaySnaps.map((snap) => {
                const retention = snap.course_retentions?.[course];
                const value = retention ?? 0;
                return (
                  <div
                    key={snap.week}
                    style={{
                      width: cellW,
                      height: 26,
                      background: retention !== undefined ? retentionColor(value) : "#f1f5f9",
                      flexShrink: 0,
                    }}
                    className="flex items-center justify-center rounded-sm mx-px transition-opacity hover:opacity-90 cursor-default"
                    title={`${course} — Week ${snap.week}: ${retention !== undefined ? `${(value * 100).toFixed(0)}%` : "N/A"}`}
                  >
                    {retention !== undefined && (
                      <span
                        className="text-[10px] font-semibold select-none"
                        style={{ color: textColor(value) }}
                      >
                        {(value * 100).toFixed(0)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-[10px] text-slate-400 mt-2 pl-[152px]">
          ★ Exam week &nbsp;·&nbsp; Numbers = retention % &nbsp;·&nbsp; Hover for details
        </p>
      </div>
    </div>
  );
}
