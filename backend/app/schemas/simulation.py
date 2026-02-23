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


class SimulationSummary(BaseModel):
    predicted_gpa_min: float
    predicted_gpa_max: float
    predicted_gpa_mean: float
    burnout_risk: Literal["LOW", "MEDIUM", "HIGH"]
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
