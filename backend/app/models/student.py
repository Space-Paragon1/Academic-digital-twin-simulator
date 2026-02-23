from datetime import datetime
from sqlalchemy import DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    target_gpa: Mapped[float] = mapped_column(Float, default=3.5)
    weekly_work_hours: Mapped[float] = mapped_column(Float, default=0.0)
    sleep_target_hours: Mapped[float] = mapped_column(Float, default=7.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    courses: Mapped[list["Course"]] = relationship("Course", back_populates="student", cascade="all, delete-orphan")
    simulation_runs: Mapped[list["SimulationRun"]] = relationship("SimulationRun", back_populates="student", cascade="all, delete-orphan")
