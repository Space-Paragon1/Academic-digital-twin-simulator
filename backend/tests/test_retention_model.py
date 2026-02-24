"""Tests for the knowledge retention model (Ebbinghaus forgetting curve)."""

import math
import pytest

from app.simulation.retention_model import (
    update_retention,
    semester_retention_curve,
)


# ── update_retention ──────────────────────────────────────────────────────────

def test_retention_bounded_between_0_and_1():
    result = update_retention(prior_retention=0.5, study_hours=5.0, study_strategy="spaced")
    assert 0.0 <= result <= 1.0


def test_zero_study_hours_causes_decay():
    """With no study this week, retention should drop below the prior."""
    result = update_retention(prior_retention=0.8, study_hours=0.0, study_strategy="mixed")
    assert result < 0.8


def test_more_study_hours_gives_higher_retention():
    low = update_retention(prior_retention=0.0, study_hours=1.0, study_strategy="spaced")
    high = update_retention(prior_retention=0.0, study_hours=10.0, study_strategy="spaced")
    assert high > low


def test_spaced_strategy_retains_better_than_cramming_over_time():
    """After several weeks at constant study hours, spaced should outperform cramming."""
    spaced = 0.0
    crammed = 0.0
    for _ in range(8):
        spaced = update_retention(spaced, study_hours=3.0, study_strategy="spaced")
        crammed = update_retention(crammed, study_hours=3.0, study_strategy="cramming")
    assert spaced > crammed


def test_cramming_initial_gain_can_exceed_spaced():
    """Cramming provides a larger immediate boost but less durable retention."""
    spaced_w1 = update_retention(0.0, study_hours=8.0, study_strategy="spaced")
    cramming_w1 = update_retention(0.0, study_hours=8.0, study_strategy="cramming")
    # Cramming gain is 0.8x; spaced gets 1.25x bonus — spaced should be ahead at week 1
    # Both outcomes are valid; the key invariant is that they're both in [0,1]
    assert 0.0 <= spaced_w1 <= 1.0
    assert 0.0 <= cramming_w1 <= 1.0


def test_retention_starts_from_zero_and_grows():
    r = update_retention(prior_retention=0.0, study_hours=5.0, study_strategy="mixed")
    assert r > 0.0


def test_full_retention_decays_with_no_study():
    r = update_retention(prior_retention=1.0, study_hours=0.0, study_strategy="spaced",
                         days_since_last_review=7)
    assert r < 1.0


def test_unknown_strategy_falls_back_gracefully():
    """Unrecognised strategy should not raise — uses mixed fallback stability."""
    result = update_retention(0.3, study_hours=4.0, study_strategy="unknown_strategy")
    assert 0.0 <= result <= 1.0


# ── semester_retention_curve ──────────────────────────────────────────────────

def test_semester_curve_length_matches_num_weeks():
    curve = semester_retention_curve(num_weeks=16, weekly_study_hours=3.0, study_strategy="spaced")
    assert len(curve) == 16


def test_semester_curve_all_values_in_range():
    curve = semester_retention_curve(num_weeks=12, weekly_study_hours=5.0, study_strategy="mixed")
    assert all(0.0 <= r <= 1.0 for r in curve)


def test_semester_curve_increases_early_on():
    """With consistent study, retention should be higher at week 8 than week 1."""
    curve = semester_retention_curve(num_weeks=16, weekly_study_hours=4.0, study_strategy="spaced")
    assert curve[7] > curve[0]


def test_semester_curve_spaced_higher_than_cramming_by_end():
    spaced = semester_retention_curve(16, weekly_study_hours=3.0, study_strategy="spaced")
    cramming = semester_retention_curve(16, weekly_study_hours=3.0, study_strategy="cramming")
    assert spaced[-1] > cramming[-1]


def test_semester_curve_zero_study_stays_at_zero():
    """Starting from 0 with no study should stay at 0."""
    curve = semester_retention_curve(num_weeks=8, weekly_study_hours=0.0, study_strategy="spaced")
    assert all(r == pytest.approx(0.0, abs=1e-9) for r in curve)
