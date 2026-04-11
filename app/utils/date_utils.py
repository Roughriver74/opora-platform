from datetime import datetime, timezone
from typing import Optional, Union

from app.config import DATE_FORMATS, DATE_FORMATS_UPDATE_VISIT

# Combined list of all known date formats, ordered from most specific to least
ALL_DATE_FORMATS = [
    "%Y-%m-%dT%H:%M:%S.%f%z",  # ISO with microseconds and timezone
    "%Y-%m-%dT%H:%M:%S%z",     # ISO with timezone
    "%Y-%m-%dT%H:%M:%S.%f",    # ISO with microseconds
    "%Y-%m-%dT%H:%M:%S",       # ISO without timezone
    "%Y-%m-%d %H:%M:%S",       # Date with space separator
    "%Y-%m-%d",                 # Date only (ISO)
    "%d.%m.%Y",                 # Russian format
    "%d/%m/%Y",                 # European format
    "%m/%d/%Y",                 # US format
]


def parse_date(value: Union[str, datetime, None]) -> Optional[datetime]:
    """
    Parse a date string or datetime into a timezone-aware datetime.
    Returns None if value is None or empty.
    Raises ValueError if the string cannot be parsed.
    """
    if value is None:
        return None

    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    if not isinstance(value, str) or not value.strip():
        return None

    value = value.strip()

    for fmt in ALL_DATE_FORMATS:
        try:
            dt = datetime.strptime(value, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue

    raise ValueError(f"Не удалось распознать дату: {value}")


def parse_date_safe(value: Union[str, datetime, None]) -> Optional[datetime]:
    """
    Same as parse_date but returns None instead of raising on invalid input.
    """
    try:
        return parse_date(value)
    except (ValueError, TypeError):
        return None


def format_date_for_bitrix(dt: Optional[datetime]) -> Optional[str]:
    """
    Format datetime for Bitrix24 API (ISO 8601).
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S%z")
