"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BurnoutBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { studentsApi, simulationsApi } from "@/lib/api";
import type { SimulationResult, Student } from "@/lib/types";

interface StudentWithSim {
  student: Student;
  latestSim: SimulationResult | null;
  simCount: number;
}

const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export default function MultiStudentPage() {
  const [data,      setData]      = useState<StudentWithSim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const students = await studentsApi.list();
        const results = await Promise.all(
          students.map(async (s) => {
            try {
              const sims = await simulationsApi.history(s.id);
              return {
                student:   s,
                latestSim: sims.length > 0 ? sims[sims.length - 1] : null,
                simCount:  sims.length,
              };
            } catch {
              return { student: s, latestSim: null, simCount: 0 };
            }
          })
        );

        // Sort: HIGH risk first, then by GPA gap from target (largest gap first)
        results.sort((a, b) => {
          const riskA = a.latestSim?.summary.burnout_risk ?? "LOW";
          const riskB = b.latestSim?.summary.burnout_risk ?? "LOW";
          if (riskOrder[riskA] !== riskOrder[riskB]) return riskOrder[riskA] - riskOrder[riskB];
          const gapA = a.student.target_gpa - (a.latestSim?.summary.predicted_gpa_mean ?? a.student.target_gpa);
          const gapB = b.student.target_gpa - (b.latestSim?.summary.predicted_gpa_mean ?? b.student.target_gpa);
          return gapB - gapA;
        });

        setData(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load students.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400 text-sm">
        No student profiles found.
      </div>
    );
  }

  const highRiskCount  = data.filter((d) => d.latestSim?.summary.burnout_risk === "HIGH").length;
  const onTrackCount   = data.filter(
    (d) => d.latestSim && d.latestSim.summary.predicted_gpa_mean >= d.student.target_gpa
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <div className="flex flex-wrap gap-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
          <span className="font-bold text-red-700">{highRiskCount}</span>
          <span className="text-red-600 ml-1">student{highRiskCount !== 1 ? "s" : ""} at HIGH burnout risk</span>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm">
          <span className="font-bold text-green-700">{onTrackCount}</span>
          <span className="text-green-600 ml-1">student{onTrackCount !== 1 ? "s" : ""} on track for target GPA</span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <span className="font-bold text-gray-700">{data.length}</span>
          <span className="text-gray-600 ml-1">total profiles</span>
        </div>
      </div>

      {/* Student grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map(({ student, latestSim, simCount }) => {
          const gpa      = latestSim?.summary.predicted_gpa_mean;
          const gpaGap   = gpa !== undefined ? student.target_gpa - gpa : null;
          const onTrack  = gpa !== undefined && gpa >= student.target_gpa;
          const risk     = latestSim?.summary.burnout_risk;

          return (
            <div
              key={student.id}
              className={`rounded-xl border p-4 space-y-3 ${
                risk === "HIGH"
                  ? "border-red-200 bg-red-50"
                  : risk === "MEDIUM"
                  ? "border-amber-200 bg-amber-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{student.name}</p>
                  <p className="text-xs text-gray-500 truncate">{student.email}</p>
                </div>
                {risk && <BurnoutBadge risk={risk} />}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Target GPA</p>
                  <p className="font-semibold text-gray-800">{student.target_gpa.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Predicted GPA</p>
                  <p className={`font-semibold ${onTrack ? "text-green-700" : gpa !== undefined ? "text-amber-700" : "text-gray-400"}`}>
                    {gpa !== undefined ? gpa.toFixed(2) : "—"}
                    {gpaGap !== null && gpaGap > 0.05 && (
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        (−{gpaGap.toFixed(2)})
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Simulations</p>
                  <p className="font-semibold text-gray-800">{simCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className={`text-xs font-semibold ${onTrack ? "text-green-600" : "text-amber-600"}`}>
                    {latestSim ? (onTrack ? "On track" : "Below target") : "No simulations"}
                  </p>
                </div>
              </div>

              {/* Recommendation snippet */}
              {latestSim?.summary.recommendation && (
                <p className="text-xs text-gray-600 line-clamp-2 border-t border-gray-200 pt-2">
                  {latestSim.summary.recommendation}
                </p>
              )}

              {/* Link to latest sim */}
              {latestSim?.id && (
                <Link
                  href={`/scenarios/${latestSim.id}`}
                  className="block text-center text-xs font-medium text-brand-600 hover:underline"
                >
                  View latest simulation →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
