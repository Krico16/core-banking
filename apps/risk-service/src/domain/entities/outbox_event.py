from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime, timezone
from typing import Literal, Optional

from ulid import ULID

OutboxEventStatus = Literal["PENDING", "PUBLISHED", "FAILED"]

MAX_ERROR_LENGTH = 1000


@dataclass(frozen=True)
class OutboxEvent:
    id: str
    aggregate_id: str
    event_type: str
    payload: str
    status: OutboxEventStatus
    retry_count: int
    created_at: datetime
    published_at: Optional[datetime]
    error: Optional[str]

    @staticmethod
    def pending(aggregate_id: str, event_type: str, payload: str) -> "OutboxEvent":
        return OutboxEvent(
            id=str(ULID()),
            aggregate_id=aggregate_id,
            event_type=event_type,
            payload=payload,
            status="PENDING",
            retry_count=0,
            created_at=datetime.now(timezone.utc),
            published_at=None,
            error=None,
        )

    def mark_published(self) -> "OutboxEvent":
        return replace(self, status="PUBLISHED", published_at=datetime.now(timezone.utc), error=None)

    def mark_failed(self, error: str, max_retries: int) -> "OutboxEvent":
        retry_count = self.retry_count + 1
        status: OutboxEventStatus = "FAILED" if retry_count >= max_retries else "PENDING"
        return replace(self, status=status, retry_count=retry_count, error=error[:MAX_ERROR_LENGTH])
