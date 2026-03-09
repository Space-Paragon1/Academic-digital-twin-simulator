from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class TimeAllocation(BaseModel):
    class_hours: float
    work_hours: float
    sleep_hours: float
    deep_study_hours: float
    shallow_study_hours: float
    recovery_hours: float
    social_hours: float
    total_hours: float


class WeeklySnapshot(BaseModel):
    week: int
    cognitive_load: float = Field(..., ge=0.0, le=100.0)
    predicted_gpa: float = Field(..., ge=0.0, le=4.0)
    burnout_probability: float = Field(..., ge=0.0, le=1.0)
    fatigue_level: float = Field(..., ge=0.0, le=1.0)
    retention_score: float = Field(..., ge=0.0, le=1.0)
    time_allocation: TimeAllocation
    course_grades: dict[str, float]
    course_retentions: dict[str, float] = Field(default_factory=dict)
    is_exam_week: bool = False


class SimulationSummary(BaseModel):
    predicted_gpa_min: float
    predicted_gpa_max: float
    predicted_gpa_mean: float
    burnout_risk: Literal["LOW", "MEDIUM", "HIGH"]
    burnout_probability: float = Field(default=0.0, ge=0.0, le=1.0)
    peak_overload_weeks: list[int]
    required_study_hours_per_week: float
    sleep_deficit_hours: float
    recommendation: str


class ScenarioConfig(BaseModel):
    student_id: int
    num_weeks: int = Field(default=16, ge=4, le=20)
    work_hours_per_week: float = Field(default=0.0, ge=0.0, le=60.0)
    sleep_target_hours: float = Field(default=7.0, ge=4.0, le=12.0)
    study_strategy: Literal["spaced", "cramming", "mixed"] = "spaced"
    include_course_ids: list[int] = Field(default_factory=list)
    scenario_name: str | None = None
    exam_weeks: list[int] = Field(default_factory=lambda: [8, 16])
    # New fields
    extracurricular_hours: float = Field(default=0.0, ge=0.0, le=20.0)
    sleep_schedule: Literal["fixed", "variable"] = "fixed"
    drop_course_id: int | None = None
    drop_at_week: int | None = None


class SimulationResult(BaseModel):
    id: int | None = None
    scenario_config: ScenarioConfig
    summary: SimulationSummary
    weekly_snapshots: list[WeeklySnapshot]
    created_at: datetime | None = None


class OptimizationConstraints(BaseModel):
    max_work_hours_per_week: float = Field(default=20.0, ge=0.0, le=60.0)
    min_sleep_hours: float = Field(default=6.0, ge=4.0, le=10.0)
    target_min_gpa: float = Field(default=3.0, ge=0.0, le=4.0)


class OptimizationRequest(BaseModel):
    student_id: int
    num_weeks: int = Field(default=16, ge=4, le=20)
    constraints: OptimizationConstraints = Field(default_factory=OptimizationConstraints)
    objective: Literal["maximize_gpa", "minimize_burnout", "balanced"] = "maximize_gpa"


class OptimizationResult(BaseModel):
    objective: str
    optimal_work_hours: float
    optimal_sleep_hours: float
    optimal_study_hours_per_course: dict[str, float]
    optimal_study_strategy: str
    predicted_gpa: float
    predicted_burnout_probability: float
    simulation_result: SimulationResult


# ── Monte Carlo ────────────────────────────────────────────────────────────────

class MonteCarloConfig(BaseModel):
    runs: int = Field(default=200, ge=10, le=1000)
    study_variance: float = Field(default=0.15, ge=0.0, le=0.5)


class MonteCarloRequest(BaseModel):
    scenario_config: ScenarioConfig
    monte_carlo: MonteCarloConfig = Field(default_factory=MonteCarloConfig)


class MonteCarloResult(BaseModel):
    runs: int
    p10_gpa: float
    p50_gpa: float
    p90_gpa: float
    burnout_probability_mean: float
    weekly_p10: list[float]
    weekly_p50: list[float]
    weekly_p90: list[float]


# ── Goal Targeting ─────────────────────────────────────────────────────────────

class GoalTargetRequest(BaseModel):
    student_id: int
    target_gpa: float = Field(..., ge=0.0, le=4.0)
    num_weeks: int = Field(default=16, ge=4, le=20)
    max_work_hours: float = Field(default=20.0, ge=0.0, le=60.0)
    exam_weeks: list[int] = Field(default_factory=lambda: [8, 16])


class GoalTargetResult(BaseModel):
    achievable: bool
    required_study_hours_per_week: float
    recommended_work_hours: float
    recommended_sleep_hours: float
    recommended_strategy: str
    predicted_gpa: float
    gap_to_target: float
    tips: list[str]


# ── AI Advisor ─────────────────────────────────────────────────────────────────

class AdvisorMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AdvisorRequest(BaseModel):
    student_id: int
    simulation_id: int | None = None
    messages: list[AdvisorMessage]


class AdvisorResponse(BaseModel):
    reply: str
    simulation_context_used: bool


# ── Actual Grades ──────────────────────────────────────────────────────────────

class ActualGradeEntry(BaseModel):
    course_name: str
    week: int
    actual_grade: float = Field(..., ge=0.0, le=100.0)


class ActualGradesUpdate(BaseModel):
    grades: list[ActualGradeEntry]


class ActualGradesResponse(BaseModel):
    saved: int
    grades: list[ActualGradeEntry]
