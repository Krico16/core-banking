from datetime import datetime, timezone
from typing import Any, Optional

from ulid import ULID

PRODUCER = "risk-service"
EVENT_VERSION = 1


def build_event_envelope(
    event_type: str,
    subject_id: str,
    data: dict[str, Any],
    correlation_id: Optional[str] = None,
    causation_id: Optional[str] = None,
) -> dict[str, Any]:
    event_id = str(ULID())
    return {
        "eventId": event_id,
        "eventType": event_type,
        "eventVersion": EVENT_VERSION,
        "occurredAt": datetime.now(timezone.utc).isoformat(),
        "producer": PRODUCER,
        "correlationId": correlation_id or event_id,
        "causationId": causation_id or event_id,
        "subjectId": subject_id,
        "data": data,
    }
