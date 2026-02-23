"use client";

import { useState, useCallback } from "react";
import { studentsApi, coursesApi } from "@/lib/api";
import type { Course, CourseCreate, Student, StudentCreate, StudentUpdate } from "@/lib/types";

interface UseStudentReturn {
  student: Student | null;
  courses: Course[];
  isLoading: boolean;
  error: string | null;
  createStudent: (data: StudentCreate) => Promise<Student | null>;
  loadStudent: (id: number) => Promise<void>;
  updateStudent: (id: number, data: StudentUpdate) => Promise<void>;
  addCourse: (studentId: number, data: CourseCreate) => Promise<void>;
  removeCourse: (courseId: number) => Promise<void>;
  loadCourses: (studentId: number) => Promise<void>;
}

export function useStudent(): UseStudentReturn {
  const [student, setStudent] = useState<Student | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withLoading = useCallback(async (fn: () => Promise<void>) => {
    setIsLoading(true);
    setError(null);
    try {
      await fn();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createStudent = useCallback(async (data: StudentCreate): Promise<Student | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const s = await studentsApi.create(data);
      setStudent(s);
      return s;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create student.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadStudent = useCallback(
    async (id: number) => withLoading(async () => setStudent(await studentsApi.get(id))),
    [withLoading]
  );

  const updateStudent = useCallback(
    async (id: number, data: StudentUpdate) =>
      withLoading(async () => setStudent(await studentsApi.update(id, data))),
    [withLoading]
  );

  const loadCourses = useCallback(
    async (studentId: number) =>
      withLoading(async () => setCourses(await coursesApi.list(studentId))),
    [withLoading]
  );

  const addCourse = useCallback(
    async (studentId: number, data: CourseCreate) =>
      withLoading(async () => {
        await coursesApi.add(studentId, data);
        setCourses(await coursesApi.list(studentId));
      }),
    [withLoading]
  );

  const removeCourse = useCallback(
    async (courseId: number) =>
      withLoading(async () => {
        await coursesApi.remove(courseId);
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
      }),
    [withLoading]
  );

  return {
    student,
    courses,
    isLoading,
    error,
    createStudent,
    loadStudent,
    updateStudent,
    addCourse,
    removeCourse,
    loadCourses,
  };
}
