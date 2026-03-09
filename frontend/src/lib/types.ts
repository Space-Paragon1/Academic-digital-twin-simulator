// ── Student ───────────────────────────────────────────────────────────────────

export interface Student {
  id: number;
  name: string;
  email: string;
  target_gpa: number;
  weekly_work_hours: number;
  sleep_target_hours: number;
  created_at: string;
}

export interface StudentCreate {
  name: string;
  email: string;
  target_gpa: number;
  weekly_work_hours: number;
  sleep_target_hours: number;
}

export interface StudentUpdate {
  name?: string;
  email?: string;
  target_gpa?: number;
  weekly_work_hours?: number;
  sleep_target_hours?: number;
}

// ── Course ────────────────────────────────────────────────────────────────────

export interface AssessmentStructure {
  assignments: number;
  midterm: number;
  final: number;
}

export interface Course {
  id: number;
  student_id: number;
  name: string;
  credits: number;
  difficulty_score: number;
  weekly_workload_hours: number;
  assessment_structure: AssessmentStructure;
}

export interface CourseCreate {
  name: string;
  credits: number;
  difficulty_score: number;
  weekly_workload_hours: number;
  assessment_structure: AssessmentStructure;
}

// ── Simulation ────────────────────────────────────────────────────────────────

export type StudyStrategy = "spaced" | "cramming" | "mixed";
export type BurnoutRisk = "LOW" | "MEDIUM" | "HIGH";
export type OptimizationObjective = "maximize_gpa" | "minimize_burnout" | "balanced";
export type SleepSchedule = "fixed" | "variable";

export interface ScenarioConfig {
  student_id: number;
  num_weeks: number;
  work_hours_per_week: number;
  sleep_target_hours: number;
  study_strategy: StudyStrategy;
  include_course_ids: number[];
  scenario_name?: string;
  exam_weeks: number[];
  // Advanced options
  extracurricular_hours?: number;
  sleep_schedule?: SleepSchedule;
  drop_course_id?: number | null;
  drop_at_week?: number | null;
}

export interface TimeAllocation {
  class_hours: number;
  work_hours: number;
  sleep_hours: number;
  deep_study_hours: number;
  shallow_study_hours: number;
  recovery_hours: number;
  social_hours: number;
  total_hours: number;
}

export interface WeeklySnapshot {
  week: number;
  cognitive_load: number;
  predicted_gpa: number;
  burnout_probability: number;
  fatigue_level: number;
  retention_score: number;
  time_allocation: TimeAllocation;
  course_grades: Record<string, number>;
  course_retentions: Record<string, number>;
  is_exam_week: boolean;
}

export interface SimulationSummary {
  predicted_gpa_min: number;
  predicted_gpa_max: number;
  predicted_gpa_mean: number;
  burnout_risk: BurnoutRisk;
  burnout_probability: number;
  peak_overload_weeks: number[];
  required_study_hours_per_week: number;
  sleep_deficit_hours: number;
  recommendation: string;
}

export interface SimulationResult {
  id?: number;
  scenario_config: ScenarioConfig;
  summary: SimulationSummary;
  weekly_snapshots: WeeklySnapshot[];
  created_at?: string;
}

// ── Canvas LMS ────────────────────────────────────────────────────────────────

export interface CanvasCoursePreviewed {
  canvas_id: number;
  name: string;
  course_code: string;
  credits: number;
  difficulty_score: number;
  weekly_workload_hours: number;
}

export interface CanvasImportPreview {
  courses: CanvasCoursePreviewed[];
  count: number;
}

export interface CanvasPreviewRequest {
  student_id: number;
  canvas_url: string;
  canvas_token: string;
}

// ── Optimization ──────────────────────────────────────────────────────────────

export interface OptimizationConstraints {
  max_work_hours_per_week: number;
  min_sleep_hours: number;
  target_min_gpa: number;
}

export interface OptimizationRequest {
  student_id: number;
  num_weeks: number;
  constraints: OptimizationConstraints;
  objective: OptimizationObjective;
}

export interface OptimizationResult {
  objective: string;
  optimal_work_hours: number;
  optimal_sleep_hours: number;
  optimal_study_hours_per_course: Record<string, number>;
  optimal_study_strategy: StudyStrategy;
  predicted_gpa: number;
  predicted_burnout_probability: number;
  simulation_result: SimulationResult;
}

// ── Monte Carlo ───────────────────────────────────────────────────────────────

export interface MonteCarloConfig {
  runs: number;
  study_variance: number;
}

export interface MonteCarloRequest {
  scenario_config: ScenarioConfig;
  monte_carlo: MonteCarloConfig;
}

export interface MonteCarloResult {
  runs: number;
  p10_gpa: number;
  p50_gpa: number;
  p90_gpa: number;
  burnout_probability_mean: number;
  weekly_p10: number[];
  weekly_p50: number[];
  weekly_p90: number[];
}

// ── Goal Targeting ────────────────────────────────────────────────────────────

export interface GoalTargetRequest {
  student_id: number;
  target_gpa: number;
  num_weeks: number;
  max_work_hours: number;
  exam_weeks: number[];
}

export interface GoalTargetResult {
  achievable: boolean;
  required_study_hours_per_week: number;
  recommended_work_hours: number;
  recommended_sleep_hours: number;
  recommended_strategy: string;
  predicted_gpa: number;
  gap_to_target: number;
  tips: string[];
}

// ── AI Advisor ────────────────────────────────────────────────────────────────

export interface AdvisorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AdvisorRequest {
  student_id: number;
  simulation_id?: number;
  messages: AdvisorMessage[];
}

export interface AdvisorResponse {
  reply: string;
  simulation_context_used: boolean;
}

// ── Actual Grades ─────────────────────────────────────────────────────────────

export interface ActualGradeEntry {
  course_name: string;
  week: number;
  actual_grade: number;
}

export interface ActualGradesResponse {
  saved: number;
  grades: ActualGradeEntry[];
}
