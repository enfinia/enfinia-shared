"""Civil input and stored timestamps must never share an implicit naive policy."""
from datetime import date, datetime

import pytest

from enfinia_runtime.dates.v1 import (
    BUSINESS_TIMEZONE_V1,
    business_date_to_utc_v1,
    business_datetime_to_utc_v1,
    business_month_bounds_utc_v1,
    stored_timestamp_to_business_date_v1,
)


@pytest.mark.parametrize("raw,expected", [
    ("2026-09-01T01:00:00Z", "2026-08-31"),
    ("2026-09-01T03:00:00Z", "2026-09-01"),
    ("2026-09-01T00:00:00-03:00", "2026-09-01"),
    ("2027-01-01T01:00:00Z", "2026-12-31"),
    ("2027-01-01T03:00:00Z", "2027-01-01"),
    ("2018-12-01T01:00:00Z", "2018-11-30"),
    ("2018-12-01T02:00:00Z", "2018-12-01"),
    ("2026-09-01T00:00:00", "2026-08-31"),
])
def test_stored_timestamp_uses_business_day(raw: str, expected: str) -> None:
    assert stored_timestamp_to_business_date_v1(raw).isoformat() == expected
    assert stored_timestamp_to_business_date_v1(datetime.fromisoformat(raw)).isoformat() == expected


@pytest.mark.parametrize("raw,expected", [
    ("2026-09-01T00:00:00", "2026-09-01T03:00:00+00:00"),
    ("2027-01-01T00:00:00", "2027-01-01T03:00:00+00:00"),
    ("2018-12-01T00:00:00", "2018-12-01T02:00:00+00:00"),
    ("2026-09-01T01:00:00+00:00", "2026-09-01T01:00:00+00:00"),
    ("2026-08-31T22:00:00-03:00", "2026-09-01T01:00:00+00:00"),
])
def test_business_input_preserves_civil_day_or_known_instant(raw: str, expected: str) -> None:
    original = datetime.fromisoformat(raw)
    assert business_datetime_to_utc_v1(original).isoformat() == expected
    assert original.isoformat() == raw


def test_naive_meanings_are_explicitly_different() -> None:
    naive = datetime(2026, 9, 1)
    assert business_datetime_to_utc_v1(naive).isoformat() == "2026-09-01T03:00:00+00:00"
    assert stored_timestamp_to_business_date_v1(naive) == date(2026, 8, 31)
    assert business_date_to_utc_v1(naive.date()).isoformat() == "2026-09-01T03:00:00+00:00"
    assert naive.tzinfo is None


@pytest.mark.parametrize("month,start,end", [
    ("2026-08", "2026-08-01T03:00:00+00:00", "2026-09-01T03:00:00+00:00"),
    ("2026-12", "2026-12-01T03:00:00+00:00", "2027-01-01T03:00:00+00:00"),
    ("2018-11", "2018-11-01T03:00:00+00:00", "2018-12-01T02:00:00+00:00"),
])
def test_month_bounds_preserve_year_rollover_and_historical_dst(month: str, start: str, end: str) -> None:
    assert business_month_bounds_utc_v1(month) == (start, end)


@pytest.mark.parametrize("fold,expected", [(0, "2019-02-17T01:30:00+00:00"), (1, "2019-02-17T02:30:00+00:00")])
def test_ambiguous_historical_civil_time_preserves_explicit_fold(fold: int, expected: str) -> None:
    assert business_datetime_to_utc_v1(datetime(2019, 2, 16, 23, 30, fold=fold)).isoformat() == expected


def test_dst_midnight_gap_resolves_to_first_instant_of_day() -> None:
    instant = business_date_to_utc_v1(date(2018, 11, 4))
    assert instant.isoformat() == "2018-11-04T03:00:00+00:00"
    assert instant.astimezone(BUSINESS_TIMEZONE_V1).isoformat() == "2018-11-04T01:00:00-02:00"


@pytest.mark.parametrize("raw", ["", "not-a-date", "2026-02-30"])
def test_invalid_stored_values_fail_without_clock_fallback(raw: str) -> None:
    with pytest.raises(ValueError):
        stored_timestamp_to_business_date_v1(raw)


@pytest.mark.parametrize("month", ["", "2026-13", "2026-00", "2026-01-01"])
def test_invalid_months_fail_without_clock_fallback(month: str) -> None:
    with pytest.raises(ValueError):
        business_month_bounds_utc_v1(month)
