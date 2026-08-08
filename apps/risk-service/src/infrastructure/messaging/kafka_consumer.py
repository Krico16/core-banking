import logging
import threading
from typing import Callable, Optional

from confluent_kafka import Consumer
from opentelemetry import trace
from opentelemetry.propagate import extract

logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)

CONSUMER_GROUP = "risk-service-payment"
POLL_TIMEOUT_SECONDS = 1.0


def _extract_trace_context(headers: Optional[list[tuple[str, bytes]]]) -> trace.Context:
    """confluent-kafka has no auto-instrumentation to do this for us: attaching the
    extracted `traceparent` (injected by the producing side's outbox worker, see
    outbox_publisher_worker.py) as the active context before calling the handler is
    what lets build_event_envelope() continue the same trace for any event this
    handler produces in response."""
    carrier = {}
    for key, value in headers or []:
        if key == "traceparent" and value:
            carrier["traceparent"] = value.decode("ascii") if isinstance(value, (bytes, bytearray)) else value
    return extract(carrier)


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
            extracted_ctx = _extract_trace_context(msg.headers())
            with tracer.start_as_current_span("process PaymentRiskEvaluationRequested", context=extracted_ctx):
                try:
                    self._handler(msg.value())
                except Exception:
                    logger.exception("Error processing PaymentRiskEvaluationRequested message")
