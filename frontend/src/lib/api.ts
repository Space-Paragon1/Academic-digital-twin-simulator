import axios from "axios";
import type {
  Course,
  CourseCreate,
  OptimizationRequest,
  OptimizationResult,
  ScenarioConfig,
  SimulationResult,
  Student,
  StudentCreate,
  StudentUpdate,
} from "./types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
  // Fail fast: 10 s for normal requests, 60 s for long-running optimizer
  timeout: 10_000,
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
      return Promise.reject(new Error("Request timed out — is the backend running on port 8000?"));
    }
    if (!err.response) {
      return Promise.reject(new Error("Cannot reach the backend — start it with: uvicorn app.main:app --reload --port 8000"));
    }
    const detail = err.response?.data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((d: { msg: string }) => d.msg).join(", ")
      : (detail as string | undefined) ?? err.message ?? "Unknown error";
    return Promise.reject(new Error(message));
  }
);

// ── Students ──────────────────────────────────────────────────────────────────

export const studentsApi = {
  create: (data: StudentCreate) =>
    api.post<Student>("/api/v1/students/", data).then((r) => r.data),

  get: (id: number) =>
    api.get<Student>(`/api/v1/students/${id}`).then((r) => r.data),

  update: (id: number, data: StudentUpdate) =>
    api.put<Student>(`/api/v1/students/${id}`, data).then((r) => r.data),
};

// ── Courses ───────────────────────────────────────────────────────────────────

export const coursesApi = {
  add: (studentId: number, data: CourseCreate) =>
    api
      .post<Course>(`/api/v1/students/${studentId}/courses`, data)
      .then((r) => r.data),

  list: (studentId: number) =>
    api
      .get<Course[]>(`/api/v1/students/${studentId}/courses`)
      .then((r) => r.data),

  remove: (courseId: number) =>
    api.delete(`/api/v1/courses/${courseId}`).then((r) => r.data),
};

// ── Simulations ───────────────────────────────────────────────────────────────

export const simulationsApi = {
  run: (config: ScenarioConfig) =>
    api
      .post<SimulationResult>("/api/v1/simulations/run", config)
      .then((r) => r.data),

  get: (simId: number) =>
    api
      .get<SimulationResult>(`/api/v1/simulations/${simId}`)
      .then((r) => r.data),

  history: (studentId: number) =>
    api
      .get<SimulationResult[]>(`/api/v1/simulations/student/${studentId}`)
      .then((r) => r.data),

  delete: (simId: number) =>
    api.delete(`/api/v1/simulations/${simId}`).then((r) => r.data),
};

// ── Optimization ──────────────────────────────────────────────────────────────

export const optimizationApi = {
  optimize: (request: OptimizationRequest) =>
    api
      .post<OptimizationResult>("/api/v1/scenarios/optimize", request, { timeout: 60_000 })
      .then((r) => r.data),
};
