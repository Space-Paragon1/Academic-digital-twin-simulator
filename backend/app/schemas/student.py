from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class StudentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=1, max_length=255)
    target_gpa: float = Field(default=3.5, ge=0.0, le=4.0)
    weekly_work_hours: float = Field(default=0.0, ge=0.0, le=80.0)
    sleep_target_hours: float = Field(default=7.0, ge=4.0, le=12.0)


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: str | None = Field(default=None, min_length=1, max_length=255)
    target_gpa: float | None = Field(default=None, ge=0.0, le=4.0)
    weekly_work_hours: float | None = Field(default=None, ge=0.0, le=80.0)
    sleep_target_hours: float | None = Field(default=None, ge=4.0, le=12.0)


class StudentOut(StudentBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
