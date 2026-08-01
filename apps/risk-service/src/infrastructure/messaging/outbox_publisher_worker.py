import logging
import threading
from typing import Optional

from sqlalchemy import text

from infrastructure.messaging.kafka_producer import KafkaProducerWrapper
from infrastructure.persistence.db import SessionLocal

logger = logging.getLogger(__name__)

MAX_RETRIES = 10
BATCH_SIZE = 100
POLL_INTERVAL_SECONDS = 1.0

_SELECT_PENDING_SQL = text(
    """
    SELECT id, aggregate_id, event_type, payload, retry_count
    FROM outbox_events
    WHERE status = 'PENDING' AND retry_count < :max_retries
    ORDER BY created_at
    LIMIT :batch_size
    FOR UPDATE SKIP LOCKED
    """
)

_MARK_PUBLISHED_SQL = text(
    "UPDATE outbox_events SET status = 'PUBLISHED', published_at = now(), error = NULL WHERE id = :id"
)

_MARK_RETRY_SQL = text(
    "UPDATE outbox_events SET status = :status, retry_count = :retry_count, error = :error WHERE id = :id"
)


class OutboxPublisherWorker:
    """Mismo patrón que ledger-service (Java) y los workers TypeScript: polling con
    SELECT ... FOR UPDATE SKIP LOCKED, batch=100, maxRetries=10, marca
    PENDING/PUBLISHED/FAILED. Corre en un hilo daemon separado del event loop de FastAPI."""

    def __init__(self, producer: KafkaProducerWrapper, topic: str) -> None:
        self._producer = producer
        self._topic = topic
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, daemon=True, name="outbox-publisher-worker")
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)

    def _run(self) -> None:
        while not self._stop_event.is_set():
            try:
                self.publish_pending_events()
            except Exception:
                logger.exception("Outbox publisher tick failed")
            self._stop_event.wait(POLL_INTERVAL_SECONDS)

    def publish_pending_events(self) -> None:
        with SessionLocal() as session:
            rows = (
                session.execute(_SELECT_PENDING_SQL, {"max_retries": MAX_RETRIES, "batch_size": BATCH_SIZE})
                .mappings()
                .all()
            )

            for row in rows:
                try:
                    self._producer.send(self._topic, key=row["aggregate_id"], value=row["payload"])
                    session.execute(_MARK_PUBLISHED_SQL, {"id": row["id"]})
                except Exception as exc:
                    retry_count = row["retry_count"] + 1
                    status = "FAILED" if retry_count >= MAX_RETRIES else "PENDING"
                    session.execute(
                        _MARK_RETRY_SQL,
                        {"status": status, "retry_count": retry_count, "error": str(exc)[:1000], "id": row["id"]},
                    )

            session.commit()
