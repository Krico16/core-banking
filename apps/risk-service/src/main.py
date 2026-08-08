import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from infrastructure.config.settings import get_settings
from infrastructure.messaging.kafka_consumer import PaymentRiskRequestConsumer
from infrastructure.messaging.kafka_producer import KafkaProducerWrapper
from infrastructure.messaging.outbox_publisher_worker import OutboxPublisherWorker
from infrastructure.messaging.risk_request_handler import RiskRequestHandler
from presentation.health import router as health_router
from presentation.metrics import router as metrics_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

settings = get_settings()

_producer = KafkaProducerWrapper(settings.redpanda_brokers)
_outbox_worker = OutboxPublisherWorker(_producer, settings.risk_events_topic)
_handler = RiskRequestHandler(settings.max_transaction_amount_cents, settings.max_daily_amount_cents)
_consumer = PaymentRiskRequestConsumer(settings.redpanda_brokers, settings.risk_requests_topic, _handler.handle)


@asynccontextmanager
async def lifespan(_: FastAPI):
    _outbox_worker.start()
    _consumer.start()
    yield
    _consumer.stop()
    _outbox_worker.stop()


app = FastAPI(title="risk-service", lifespan=lifespan)
app.include_router(health_router)
app.include_router(metrics_router)
