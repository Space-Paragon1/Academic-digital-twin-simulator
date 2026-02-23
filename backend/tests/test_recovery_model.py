"""Tests for the recovery and burnout model."""

import pytest
from app.simulation.recovery_model import (
    compute_recovery,
    compute_burnout_probability,
    burnout_risk_label,
)


def test_adequate_sleep_reduces_fatigue():
    fatigue_after = compute_recovery(
        current_fatigue=0.6,
        sleep_hours=56.0,   # 8h/night
        recovery_hours=8.0,
    )
    assert fatigue_after < 0.6


def test_sleep_deprivation_increases_fatigue():
    fatigue_after = compute_recovery(
        current_fatigue=0.3,
        sleep_hours=28.0,   # 4h/night
        recovery_hours=0.0,
    )
    assert fatigue_after > 0.3


def test_fatigue_clamped_between_0_and_1():
    f = compute_recovery(0.0, sleep_hours=49.0, recovery_hours=10.0)
    assert 0.0 <= f <= 1.0
    f2 = compute_recovery(1.0, sleep_hours=0.0, recovery_hours=0.0)
    assert 0.0 <= f2 <= 1.0


def test_high_load_history_gives_high_burnout():
    loads = [80.0] * 12
    sleeps = [35.0] * 12  # 5h/night
    recovery = [2.0] * 12
    prob = compute_burnout_probability(loads, sleeps, recovery)
    assert prob > 0.6


def test_low_load_history_gives_low_burnout():
    loads = [30.0] * 16
    sleeps = [56.0] * 16  # 8h/night
    recovery = [8.0] * 16
    prob = compute_burnout_probability(loads, sleeps, recovery)
    assert prob < 0.4


def test_burnout_risk_labels():
    assert burnout_risk_label(0.1) == "LOW"
    assert burnout_risk_label(0.5) == "MEDIUM"
    assert burnout_risk_label(0.8) == "HIGH"


def test_empty_history_returns_zero():
    assert compute_burnout_probability([], [], []) == 0.0
