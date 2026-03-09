"""SQLAlchemy ORM model for tracking actual (real) weekly grades."""
from sqlalchemy import Column, Float, ForeignKey, Integer, String

from app.db.database import Base


class ActualGrade(Base):
    __tablename__ = "actual_grades"

    id = Column(Integer, primary_key=True, index=True)
    simulation_run_id = Column(
        Integer,
        ForeignKey("simulation_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_name = Column(String, nullable=False)
    week = Column(Integer, nullable=False)
    actual_grade = Column(Float, nullable=False)
