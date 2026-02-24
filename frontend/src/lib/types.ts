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

export interface ScenarioConfig {
  student_id: number;
  num_weeks: number;
  work_hours_per_week: number;
  sleep_target_hours: number;
  study_strategy: StudyStrategy;
  include_course_ids: number[];
  scenario_name?: string;
  exam_weeks: number[];
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
