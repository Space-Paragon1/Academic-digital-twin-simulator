"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BurnoutBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { StudentProfileForm } from "@/components/forms/StudentProfileForm";
import { CourseForm } from "@/components/forms/CourseForm";
import { CanvasImport } from "@/components/forms/CanvasImport";
import { useStudent } from "@/hooks/useStudent";
import { useToast } from "@/components/ui/Toaster";
import { simulationsApi } from "@/lib/api";
import type { CourseCreate, StudentCreate, SimulationResult } from "@/lib/types";

const STUDENT_ID_KEY = "adt_student_id";

export default function ProfilePage() {
  const { student, courses, isLoading, error, createStudent, updateStudent, loadStudent, addCourse, removeCourse, loadCourses } = useStudent();
  const toast = useToast();
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [initDone, setInitDone] = useState(false);
  const [simHistory, setSimHistory] = useState<SimulationResult[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STUDENT_ID_KEY);
    if (stored) {
      const id = parseInt(stored);
      loadStudent(id).then(() => loadCourses(id)).catch(() => {});
      simulationsApi.history(id).then(setSimHistory).catch(() => {});
    }
    setInitDone(true);
  }, []);

  const handleCreateStudent = async (data: StudentCreate) => {
    try {
      const s = await createStudent(data);
      if (s) {
        localStorage.setItem(STUDENT_ID_KEY, String(s.id));
        await loadCourses(s.id).catch(() => {});
        toast.success("Profile created! Add your courses below.", "Welcome");
      }
    } catch {
      // error shown inline by hook
    }
  };

  const handleUpdateStudent = async (data: StudentCreate) => {
    if (!student) return;
    try {
      await updateStudent(student.id, data);
      toast.success("Profile saved successfully.");
    } catch {
      // error shown inline by hook
    }
  };

  const handleAddCourse = async (data: CourseCreate) => {
    if (!student) return;
    try {
      await addCourse(student.id, data);
      setShowCourseForm(false);
      toast.success(`"${data.name}" added to your courses.`);
    } catch {
      // error shown inline by hook
    }
  };

  const handleRemoveCourse = async (courseId: number, courseName: string) => {
    try {
      await removeCourse(courseId);
      toast.info(`"${courseName}" removed.`);
    } catch {
      toast.error("Failed to remove course.");
    }
  };

  if (!initDone || isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Student Profile</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card title={student ? "Edit Profile" : "Create Your Profile"}>
        <StudentProfileForm
          initial={student ?? undefined}
          onSubmit={student ? handleUpdateStudent : handleCreateStudent}
          isLoading={isLoading}
        />
      </Card>

      {student && (
        <Card title="Enrolled Courses" subtitle={`${courses.length} course${courses.length !== 1 ? "s" : ""} · ${courses.reduce((s, c) => s + c.credits, 0)} total credits`}>
          {/* Canvas LMS auto-import */}
          <div className="mb-4">
            <CanvasImport
              studentId={student.id}
              onImported={() => loadCourses(student.id).catch(() => {})}
            />
          </div>

          <div className="space-y-3 mb-4">
            {courses.map((course) => (
              <div key={course.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{course.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge label={`${course.credits} credits`} variant="info" />
                    <Badge
                      label={`Difficulty ${course.difficulty_score}/10`}
                      variant={course.difficulty_score > 7 ? "danger" : course.difficulty_score > 5 ? "warning" : "success"}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveCourse(course.id, course.name)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          {showCourseForm ? (
            <div className="border-t border-gray-200 pt-4">
              <CourseForm onSubmit={handleAddCourse} onCancel={() => setShowCourseForm(false)} isLoading={isLoading} />
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setShowCourseForm(true)}>
              + Add Course
            </Button>
          )}
        </Card>
      )}

      {/* Simulation history stats — only when there are runs */}
      {student && simHistory.length > 0 && (() => {
        const gpas = simHistory.map((r) => r.summary.predicted_gpa_mean);
        const bestGpa = Math.max(...gpas);
        const latestGpa = gpas[gpas.length - 1];
        const highRiskCount = simHistory.filter((r) => r.summary.burnout_risk === "HIGH").length;
        const latestRisk = simHistory[simHistory.length - 1].summary.burnout_risk;
        const totalCredits = courses.reduce((s, c) => s + c.credits, 0);

        return (
          <Card title="Simulation History" subtitle={`${simHistory.length} scenario${simHistory.length !== 1 ? "s" : ""} run`}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Scenarios Run", value: String(simHistory.length) },
                { label: "Best Predicted GPA", value: bestGpa.toFixed(2) },
                { label: "Latest GPA", value: latestGpa.toFixed(2) },
                { label: "High-Risk Runs", value: String(highRiskCount) },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Latest burnout risk:</span>
              <BurnoutBadge risk={latestRisk} />
              {totalCredits > 0 && (
                <span className="text-xs text-gray-400 ml-auto">{totalCredits} total credits enrolled</span>
              )}
            </div>
          </Card>
        );
      })()}
    </div>
  );
}
