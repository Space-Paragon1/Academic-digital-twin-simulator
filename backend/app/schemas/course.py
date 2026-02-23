from pydantic import BaseModel, Field


class AssessmentStructure(BaseModel):
    assignments: float = Field(default=0.30, ge=0.0, le=1.0)
    midterm: float = Field(default=0.30, ge=0.0, le=1.0)
    final: float = Field(default=0.40, ge=0.0, le=1.0)


class CourseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    credits: int = Field(..., ge=1, le=6)
    difficulty_score: float = Field(default=5.0, ge=1.0, le=10.0)
    weekly_workload_hours: float = Field(default=3.0, ge=0.5, le=20.0)
    assessment_structure: AssessmentStructure = Field(default_factory=AssessmentStructure)


class CourseCreate(CourseBase):
    pass


class CourseOut(CourseBase):
    id: int
    student_id: int

    model_config = {"from_attributes": True}
