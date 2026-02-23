"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { StudentProfileForm } from "@/components/forms/StudentProfileForm";
import { CourseForm } from "@/components/forms/CourseForm";
import { useStudent } from "@/hooks/useStudent";
import type { CourseCreate, StudentCreate } from "@/lib/types";

const STUDENT_ID_KEY = "adt_student_id";

export default function ProfilePage() {
  const { student, courses, isLoading, error, createStudent, updateStudent, loadStudent, addCourse, removeCourse, loadCourses } = useStudent();
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STUDENT_ID_KEY);
    if (stored) {
      const id = parseInt(stored);
      loadStudent(id).then(() => loadCourses(id));
    }
    setInitDone(true);
  }, []);

  const handleCreateStudent = async (data: StudentCreate) => {
    const s = await createStudent(data);
    if (s) {
      localStorage.setItem(STUDENT_ID_KEY, String(s.id));
      await loadCourses(s.id);
    }
  };

  const handleUpdateStudent = async (data: StudentCreate) => {
    if (!student) return;
    await updateStudent(student.id, data);
  };

  const handleAddCourse = async (data: CourseCreate) => {
    if (!student) return;
    await addCourse(student.id, data);
    setShowCourseForm(false);
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
                  onClick={() => removeCourse(course.id)}
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
    </div>
  );
}
