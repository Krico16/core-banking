import json
import logging
from datetime import datetime, timezone

from application.dto.payment_risk_evaluation_request import PaymentRiskEvaluationRequest
from application.use_cases.evaluate_payment_risk import EvaluatePaymentRiskUseCase
from infrastructure.persistence.db import SessionLocal
from infrastructure.persistence.models import ProcessedEventModel
from infrastructure.persistence.outbox_event_repository_impl import SqlAlchemyOutboxEventRepository
from infrastructure.persistence.risk_evaluation_repository_impl import SqlAlchemyRiskEvaluationRepository

logger = logging.getLogger(__name__)

CONSUMER_NAME = "risk-service-payment"


class RiskRequestHandler:
    """Idempotencia (regla nº4 AGENTS.md) + evaluación + outbox, todo en una sola
    transacción de BD por mensaje: si el proceso muere a mitad, el mensaje se
    reprocesa entero en el próximo poll sin efectos duplicados."""

    def __init__(self, max_transaction_amount_cents: int, max_daily_amount_cents: int) -> None:
        self._max_transaction_amount_cents = max_transaction_amount_cents
        self._max_daily_amount_cents = max_daily_amount_cents

    def handle(self, raw_message: bytes) -> None:
        envelope = json.loads(raw_message.decode("utf-8"))
        event_id = envelope.get("eventId")
        event_type = envelope.get("eventType")
        data = envelope.get("data")

        if not event_id:
            logger.warning("PaymentRiskEvaluationRequested envelope without eventId, skipping")
            return
        if event_type != "PaymentRiskEvaluationRequested":
            return
        if not data:
            logger.warning("Event %s without data, skipping", event_id)
            return

        with SessionLocal() as session:
            already = session.get(ProcessedEventModel, event_id)
            if already:
                logger.debug("Event %s already processed, skipping", event_id)
                return

            request = PaymentRiskEvaluationRequest(
                payment_id=data["paymentId"],
                source_customer_id=data.get("sourceCustomerId"),
                target_customer_id=data.get("targetCustomerId"),
                source_account_id=data["sourceAccountId"],
                target_account_id=data["targetAccountId"],
                amount=data["amount"],
                currency=data["currency"],
                requested_at=data.get("requestedAt"),
            )

            use_case = EvaluatePaymentRiskUseCase(
                SqlAlchemyOutboxEventRepository(session),
                SqlAlchemyRiskEvaluationRepository(session),
                self._max_transaction_amount_cents,
                self._max_daily_amount_cents,
            )
            decision = use_case.execute(request)

            session.add(
                ProcessedEventModel(
                    event_id=event_id,
                    consumer_name=CONSUMER_NAME,
                    processed_at=datetime.now(timezone.utc),
                )
            )
            session.commit()
            logger.info(
                "Payment %s evaluated: %s (score=%s)", request.payment_id, decision.outcome.value, decision.score
            )
