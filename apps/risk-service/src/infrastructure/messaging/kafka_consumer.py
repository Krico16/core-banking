import logging
import threading
from typing import Callable, Optional

from confluent_kafka import Consumer

logger = logging.getLogger(__name__)

CONSUMER_GROUP = "risk-service-payment"
POLL_TIMEOUT_SECONDS = 1.0


class PaymentRiskRequestConsumer:
    """Consume banking.payment.risk-requests. La idempotencia (processed_events)
    y el manejo transaccional viven en el handler inyectado, no aquí."""

    def __init__(self, bootstrap_servers: str, topic: str, handler: Callable[[bytes], None]) -> None:
        self._consumer = Consumer(
            {
                "bootstrap.servers": bootstrap_servers,
                "group.id": CONSUMER_GROUP,
                "auto.offset.reset": "earliest",
                "enable.auto.commit": True,
            }
        )
        self._topic = topic
        self._handler = handler
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def start(self) -> None:
        self._consumer.subscribe([self._topic])
        self._thread = threading.Thread(target=self._run, daemon=True, name="risk-request-consumer")
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)
        self._consumer.close()

    def _run(self) -> None:
        while not self._stop_event.is_set():
            msg = self._consumer.poll(timeout=POLL_TIMEOUT_SECONDS)
            if msg is None:
                continue
            if msg.error():
                logger.error("Kafka consumer error: %s", msg.error())
                continue
            try:
                self._handler(msg.value())
            except Exception:
                logger.exception("Error processing PaymentRiskEvaluationRequested message")
