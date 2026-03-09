"""
Seed script — populates the database with a sample student, courses, and
simulation runs so reviewers can explore the app without manual setup.

Usage:
    cd backend
    python seed.py

Safe to run multiple times — skips creation if the seed student's email
already exists.
"""

import sys
import os

# Ensure the app package is importable when running from the backend/ directory
sys.path.insert(0, os.path.dirname(__file__))

from app.db.database import Base, engine, SessionLocal
from app.db import crud
from app.schemas.student import StudentCreate
from app.schemas.course import CourseCreate
from app.schemas.simulation import ScenarioConfig
from app.simulation.engine import SimulationEngine

SEED_EMAIL = "alex.demo@university.edu"

COURSES = [
    CourseCreate(name="Data Structures & Algorithms", credits=3, difficulty_score=7.5, weekly_workload_hours=6.0),
    CourseCreate(name="Calculus II",                  credits=4, difficulty_score=8.0, weekly_workload_hours=8.0),
    CourseCreate(name="Technical Writing",             credits=3, difficulty_score=3.5, weekly_workload_hours=3.0),
    CourseCreate(name="Introduction to Physics",       credits=4, difficulty_score=6.5, weekly_workload_hours=7.0),
    CourseCreate(name="African American History",      credits=3, difficulty_score=4.0, weekly_workload_hours=3.5),
]

SCENARIOS = [
    {
        "name": "Baseline — moderate workload",
        "work_hours": 10.0,
        "sleep": 7.5,
        "strategy": "spaced",
        "exam_weeks": [8, 16],
    },
    {
        "name": "Heavy work — part-time job 20h",
        "work_hours": 20.0,
        "sleep": 6.0,
        "strategy": "mixed",
        "exam_weeks": [8, 16],
    },
    {
        "name": "Optimized — well-rested, no work",
        "work_hours": 0.0,
        "sleep": 8.5,
        "strategy": "spaced",
        "exam_weeks": [8, 16],
    },
    {
        "name": "Crunch — late nights before exams",
        "work_hours": 15.0,
        "sleep": 5.5,
        "strategy": "cramming",
        "exam_weeks": [8, 16],
    },
]


def main():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    sim_engine = SimulationEngine()

    try:
        # Check for existing seed data
        existing = crud.get_student_by_email(db, SEED_EMAIL)
        if existing:
            print(f"Seed student already exists (id={existing.id}). Skipping.")
            print("To re-seed, delete the database file (academic_twin.db) and run again.")
            return

        # Create student
        print("Creating seed student...")
        student = crud.create_student(db, StudentCreate(
            name="Alex Demo",
            email=SEED_EMAIL,
            target_gpa=3.5,
        ))
        print(f"  Created student id={student.id}: {student.name}")

        # Add courses
        print("Adding courses...")
        courses = []
        for course_data in COURSES:
            course = crud.add_course(db, student.id, course_data)
            courses.append(course)
            print(f"  Added course id={course.id}: {course.name}")

        course_ids = [c.id for c in courses]

        # Run scenarios
        print("Running simulations...")
        for s in SCENARIOS:
            config = ScenarioConfig(
                student_id=student.id,
                num_weeks=16,
                work_hours_per_week=s["work_hours"],
                sleep_target_hours=s["sleep"],
                study_strategy=s["strategy"],
                exam_weeks=s["exam_weeks"],
                include_course_ids=course_ids,
                scenario_name=s["name"],
            )
            result = sim_engine.run(config=config, courses=courses, student=student)
            run = crud.create_simulation_run(db, student.id, config, result)
            print(
                f"  Ran '{s['name']}' → GPA {result.summary.predicted_gpa_mean:.2f}, "
                f"burnout {result.summary.burnout_risk} (sim id={run.id})"
            )

        print("\nSeed complete!")
        print(f"  Student ID : {student.id}")
        print(f"  Email      : {student.email}")
        print(f"  Courses    : {len(courses)}")
        print(f"  Simulations: {len(SCENARIOS)}")
        print("\nOpen http://localhost:3000/profile and enter the student ID above,")
        print("or log in with the email to load the pre-seeded profile.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
