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
    # Feature 2: notification preferences
    notify_burnout_alert: bool | None = None
    notify_weekly_summary: bool | None = None
    # Feature 7: theme preference
    theme_preference: str | None = Field(default=None, max_length=10)


class StudentOut(StudentBase):
    id: int
    created_at: datetime
    # Feature 1: email verification
    is_verified: bool = True
    # Feature 2: notification preferences
    notify_burnout_alert: bool = True
    notify_weekly_summary: bool = True
    # Feature 7: theme preference
    theme_preference: str = "system"

    model_config = {"from_attributes": True}
