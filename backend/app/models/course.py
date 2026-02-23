from sqlalchemy import Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    credits: Mapped[int] = mapped_column(Integer, nullable=False)
    difficulty_score: Mapped[float] = mapped_column(Float, default=5.0)
    weekly_workload_hours: Mapped[float] = mapped_column(Float, default=3.0)
    assessment_structure: Mapped[dict] = mapped_column(JSON, default=lambda: {
        "assignments": 0.30,
        "midterm": 0.30,
        "final": 0.40,
    })

    student: Mapped["Student"] = relationship("Student", back_populates="courses")
