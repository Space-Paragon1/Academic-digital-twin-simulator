"""
Performance Model.

Maps student state (study time, cognitive load, retention) to predicted
academic performance (per-course grades and cumulative GPA).

Design:
  - Sigmoid-shaped grade curve: more study → diminishing returns
  - Cognitive load penalty: load > 70 degrades grade nonlinearly
  - Retention bonus: high knowledge retention lifts performance floor

Grade scale:
  A: 93–100 → 4.0 GPA points
  A-: 90–92  → 3.7
  B+: 87–89  → 3.3
  B:  83–86  → 3.0
  B-: 80–82  → 2.7
  C+: 77–79  → 2.3
  C:  73–76  → 2.0
  ...
"""

import math

GRADE_TO_GPA = [
    (93, 4.0),
    (90, 3.7),
    (87, 3.3),
    (83, 3.0),
    (80, 2.7),
    (77, 2.3),
    (73, 2.0),
    (70, 1.7),
    (67, 1.3),
    (63, 1.0),
    (60, 0.7),
    (0, 0.0),
]


def _sigmoid(x: float, midpoint: float = 0.0, steepness: float = 1.0) -> float:
    return 1.0 / (1.0 + math.exp(-steepness * (x - midpoint)))


def predict_grade(
    course,
    weekly_study_hours: float,
    avg_cognitive_load: float,
    cumulative_retention: float,
) -> float:
    """
    Predict a student's percentage grade in a course for a given week's state.

    Formula:
        base_score = sigmoid(study_ratio) scaled to 40–95 range
        load_penalty = 0 if load <= 70, else (load - 70) * 0.5
        retention_bonus = cumulative_retention * 10 (max +10 points)
        grade = clamp(base_score - load_penalty + retention_bonus, 0, 100)

    Args:
        course: Course ORM object (needs difficulty_score, weekly_workload_hours).
        weekly_study_hours: Hours studied for this course this week.
        avg_cognitive_load: Rolling average cognitive load this week (0–100).
        cumulative_retention: Knowledge retention score for this course (0–1).

    Returns:
        Predicted grade as a percentage [0, 100].
    """
    # Study ratio: how much student studied vs what course demands
    # Adjusted by difficulty (hard courses demand more study per point)
    demand = course.weekly_workload_hours * (course.difficulty_score / 5.0)
    study_ratio = weekly_study_hours / max(demand, 0.5)

    # Sigmoid maps study_ratio → base score
    # ratio = 1.0 → ~75, ratio = 2.0 → ~90, ratio = 0.5 → ~60
    sigmoid_val = _sigmoid(study_ratio, midpoint=1.0, steepness=2.5)
    base_score = 40.0 + sigmoid_val * 55.0  # range: 40–95

    # Cognitive load penalty (kicks in hard above threshold)
    if avg_cognitive_load > 70.0:
        load_penalty = (avg_cognitive_load - 70.0) * 0.5
    else:
        load_penalty = 0.0

    # Retention bonus (prior knowledge lifts performance)
    retention_bonus = cumulative_retention * 10.0

    grade = base_score - load_penalty + retention_bonus
    return float(min(max(grade, 0.0), 100.0))


def grade_to_gpa_points(percentage: float) -> float:
    """Convert a percentage grade to GPA points using standard 4.0 scale."""
    for threshold, gpa in GRADE_TO_GPA:
        if percentage >= threshold:
            return gpa
    return 0.0


def compute_gpa(
    course_grades: dict[str, float],
    course_credits: dict[str, int],
) -> float:
    """
    Compute weighted GPA from a dictionary of course grades and credit hours.

    Args:
        course_grades: Mapping of course name → percentage grade (0–100).
        course_credits: Mapping of course name → credit hours.

    Returns:
        GPA on a 4.0 scale.
    """
    if not course_grades:
        return 0.0

    total_quality_points = 0.0
    total_credits = 0

    for course_name, grade in course_grades.items():
        credits = course_credits.get(course_name, 3)
        gpa_points = grade_to_gpa_points(grade)
        total_quality_points += gpa_points * credits
        total_credits += credits

    return round(total_quality_points / total_credits, 2) if total_credits > 0 else 0.0


def compute_semester_gpa(
    weekly_grades: list[dict[str, float]],
    course_credits: dict[str, int],
) -> float:
    """
    Compute final semester GPA from the average grade across all simulation weeks.

    Args:
        weekly_grades: List of per-week grade dictionaries {course_name: grade}.
        course_credits: Mapping of course name → credit hours.

    Returns:
        Final semester GPA.
    """
    if not weekly_grades:
        return 0.0

    # Average grade per course across all weeks
    course_names = weekly_grades[0].keys()
    avg_grades = {
        name: sum(week[name] for week in weekly_grades) / len(weekly_grades)
        for name in course_names
    }
    return compute_gpa(avg_grades, course_credits)
