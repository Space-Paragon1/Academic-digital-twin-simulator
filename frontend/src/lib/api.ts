import axios from "axios";
import type {
  ActualGradeEntry,
  ActualGradesResponse,
  AdvisorRequest,
  AdvisorResponse,
  CanvasImportPreview,
  CanvasPreviewRequest,
  Course,
  CourseCreate,
  GoalTargetRequest,
  GoalTargetResult,
  MonteCarloRequest,
  MonteCarloResult,
  OptimizationRequest,
  OptimizationResult,
  ScenarioConfig,
  SimulationResult,
  Student,
  StudentCreate,
  StudentUpdate,
} from "./types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "https://academic-digital-twin-simulator-production.up.railway.app",
  headers: { "Content-Type": "application/json" },
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
  list: () =>
    api.get<Student[]>("/api/v1/students/").then((r) => r.data),

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

// ── Monte Carlo ───────────────────────────────────────────────────────────────

export const monteCarloApi = {
  run: (request: MonteCarloRequest) =>
    api
      .post<MonteCarloResult>("/api/v1/simulations/monte-carlo", request, { timeout: 120_000 })
      .then((r) => r.data),
};

// ── Actual Grades ─────────────────────────────────────────────────────────────

export const actualGradesApi = {
  save: (simId: number, grades: ActualGradeEntry[]) =>
    api
      .post<ActualGradesResponse>(`/api/v1/simulations/${simId}/actual-grades`, { grades })
      .then((r) => r.data),

  get: (simId: number) =>
    api
      .get<ActualGradesResponse>(`/api/v1/simulations/${simId}/actual-grades`)
      .then((r) => r.data),
};

// ── Canvas LMS ────────────────────────────────────────────────────────────────

export const canvasApi = {
  preview: (request: CanvasPreviewRequest) =>
    api
      .post<CanvasImportPreview>("/api/v1/canvas/preview", request, { timeout: 20_000 })
      .then((r) => r.data),
};

// ── Optimization ──────────────────────────────────────────────────────────────

export const optimizationApi = {
  optimize: (request: OptimizationRequest) =>
    api
      .post<OptimizationResult>("/api/v1/scenarios/optimize", request, { timeout: 60_000 })
      .then((r) => r.data),
};

// ── Password reset ────────────────────────────────────────────────────────────

export const passwordApi = {
  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/api/v1/auth/forgot-password", { email }).then((r) => r.data),

  resetPassword: (token: string, new_password: string) =>
    api.post<{ message: string }>("/api/v1/auth/reset-password", { token, new_password }).then((r) => r.data),
};

// ── Advisor ───────────────────────────────────────────────────────────────────

export const advisorApi = {
  chat: (request: AdvisorRequest) =>
    api
      .post<AdvisorResponse>("/api/v1/advisor/chat", request, { timeout: 30_000 })
      .then((r) => r.data),

  goalTarget: (request: GoalTargetRequest) =>
    api
      .post<GoalTargetResult>("/api/v1/advisor/goal-target", request, { timeout: 90_000 })
      .then((r) => r.data),
};
