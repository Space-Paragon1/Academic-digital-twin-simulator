from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.course import Course
from app.models.simulation import SimulationRun
from app.schemas.student import StudentCreate, StudentUpdate
from app.schemas.course import CourseCreate
from app.schemas.simulation import ScenarioConfig, SimulationResult


# ── Student ──────────────────────────────────────────────────────────────────

def get_student(db: Session, student_id: int) -> Student | None:
    return db.query(Student).filter(Student.id == student_id).first()


def get_student_by_email(db: Session, email: str) -> Student | None:
    return db.query(Student).filter(Student.email == email).first()


def create_student(db: Session, data: StudentCreate) -> Student:
    student = Student(**data.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def update_student(db: Session, student_id: int, data: StudentUpdate) -> Student | None:
    student = get_student(db, student_id)
    if not student:
        return None
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


# ── Course ────────────────────────────────────────────────────────────────────

def get_courses_for_student(db: Session, student_id: int) -> list[Course]:
    return db.query(Course).filter(Course.student_id == student_id).all()


def get_course(db: Session, course_id: int) -> Course | None:
    return db.query(Course).filter(Course.id == course_id).first()


def create_course(db: Session, student_id: int, data: CourseCreate) -> Course:
    payload = data.model_dump()
    course = Course(student_id=student_id, **payload)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def delete_course(db: Session, course_id: int) -> bool:
    course = get_course(db, course_id)
    if not course:
        return False
    db.delete(course)
    db.commit()
    return True


# ── Simulation ────────────────────────────────────────────────────────────────

def create_simulation_run(
    db: Session,
    student_id: int,
    config: ScenarioConfig,
    result: SimulationResult,
) -> SimulationRun:
    run = SimulationRun(
        student_id=student_id,
        scenario_config=config.model_dump(mode="json"),
        results=result.model_dump(mode="json"),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def get_simulation_run(db: Session, sim_id: int) -> SimulationRun | None:
    return db.query(SimulationRun).filter(SimulationRun.id == sim_id).first()


def get_simulation_runs_for_student(
    db: Session, student_id: int, skip: int = 0, limit: int = 50
) -> list[SimulationRun]:
    return (
        db.query(SimulationRun)
        .filter(SimulationRun.student_id == student_id)
        .order_by(SimulationRun.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def delete_simulation_run(db: Session, sim_id: int) -> bool:
    run = get_simulation_run(db, sim_id)
    if not run:
        return False
    db.delete(run)
    db.commit()
    return True
