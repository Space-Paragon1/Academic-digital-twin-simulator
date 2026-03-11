from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    # Nullable so seed/legacy accounts without passwords still work
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default=None)
    target_gpa: Mapped[float] = mapped_column(Float, default=3.5)
    weekly_work_hours: Mapped[float] = mapped_column(Float, default=0.0)
    sleep_target_hours: Mapped[float] = mapped_column(Float, default=7.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Feature 1: Email verification
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    verification_token: Mapped[Optional[str]] = mapped_column(String(512), nullable=True, default=None)

    # Feature 2: Notification preferences
    notify_burnout_alert: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_weekly_summary: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Feature 7: Theme preference
    theme_preference: Mapped[str] = mapped_column(String(10), default="system", nullable=False)

    courses: Mapped[list["Course"]] = relationship("Course", back_populates="student", cascade="all, delete-orphan")
    simulation_runs: Mapped[list["SimulationRun"]] = relationship("SimulationRun", back_populates="student", cascade="all, delete-orphan")
