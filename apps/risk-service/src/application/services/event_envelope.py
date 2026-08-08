from datetime import datetime, timezone
from typing import Any, Optional

from opentelemetry import trace
from ulid import ULID

PRODUCER = "risk-service"
EVENT_VERSION = 1


def _active_trace_ids() -> Optional[tuple[str, str]]:
    """correlationId/causationId default to the active OTel span (traceId/spanId) so
    the envelope carries real trace context across the outbox/Kafka boundary (see
    infrastructure/messaging/outbox_publisher_worker.py and kafka_consumer.py)."""
    span_context = trace.get_current_span().get_span_context()
    if not span_context.is_valid:
        return None
    return format(span_context.trace_id, "032x"), format(span_context.span_id, "016x")


def build_event_envelope(
    event_type: str,
    subject_id: str,
    data: dict[str, Any],
    correlation_id: Optional[str] = None,
    causation_id: Optional[str] = None,
) -> dict[str, Any]:
    event_id = str(ULID())
    active = _active_trace_ids()
    return {
        "eventId": event_id,
        "eventType": event_type,
        "eventVersion": EVENT_VERSION,
        "occurredAt": datetime.now(timezone.utc).isoformat(),
        "producer": PRODUCER,
        "correlationId": correlation_id or (active[0] if active else event_id),
        "causationId": causation_id or (active[1] if active else event_id),
        "subjectId": subject_id,
        "data": data,
    }
