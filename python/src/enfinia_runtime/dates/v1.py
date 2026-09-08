"""Versioned São Paulo calendar semantics for business input and stored instants."""
from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo

BUSINESS_TIMEZONE_V1 = ZoneInfo("America/Sao_Paulo")


def business_datetime_to_utc_v1(value: datetime) -> datetime:
    """Convert statement input to UTC; offsetless input is a local civil time.

    An explicit offset identifies an instant and is preserved. ZoneInfo supplies
    historical daylight-saving rules, including the input datetime's fold flag.
    Call after generating import hashes/IDs from the original parser output.
    """
    if value.tzinfo is None:
        value = value.replace(tzinfo=BUSINESS_TIMEZONE_V1)
    return value.astimezone(timezone.utc)


def business_date_to_utc_v1(day: date) -> datetime:
    """Return a business day's local start as a UTC instant."""
    return business_datetime_to_utc_v1(datetime.combine(day, time.min))


def stored_timestamp_to_business_date_v1(value: str | datetime) -> date:
    """Read a stored instant; legacy offsetless timestamps mean UTC, never local.

    This is intentionally a separate contract from business civil input. Invalid
    ISO timestamps raise ValueError; each consumer owns its presentation fallback.
    """
    instant = value if isinstance(value, datetime) else datetime.fromisoformat(value.replace("Z", "+00:00"))
    if instant.tzinfo is None:
        instant = instant.replace(tzinfo=timezone.utc)
    return instant.astimezone(BUSINESS_TIMEZONE_V1).date()


def business_month_bounds_utc_v1(month_reference: str) -> tuple[str, str]:
    """Return inclusive start/exclusive end ISO instants for a business month."""
    year, month = map(int, month_reference.split("-"))
    start = business_date_to_utc_v1(date(year, month, 1))
    end = business_date_to_utc_v1(date(year + (month == 12), month % 12 + 1, 1))
    return start.isoformat(), end.isoformat()
