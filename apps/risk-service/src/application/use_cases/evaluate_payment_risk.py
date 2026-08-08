import json
from datetime import datetime, timezone

from ulid import ULID

from application.dto.payment_risk_evaluation_request import PaymentRiskEvaluationRequest
from application.services.event_envelope import build_event_envelope
from application.services.risk_metrics import risk_evaluations_total
from domain.entities.outbox_event import OutboxEvent
from domain.ports.outbox_event_repository import OutboxEventRepository
from domain.ports.risk_evaluation_repository import RiskEvaluationRepository
from domain.value_objects.risk_decision import RiskDecision, RiskOutcome


class EvaluatePaymentRiskUseCase:
    """Reglas mínimas deterministas (no ML): límite fijo por transacción y límite
    diario acumulado por cuenta origen. Publica PaymentApprovedByRisk o
    PaymentRejectedByRisk vía outbox, en la misma unidad de trabajo que el registro
    de la evaluación (ver RiskRequestHandler, que gestiona la sesión/transacción).
    """

    def __init__(
        self,
        outbox_repository: OutboxEventRepository,
        evaluation_repository: RiskEvaluationRepository,
        max_transaction_amount_cents: int,
        max_daily_amount_cents: int,
    ) -> None:
        self._outbox = outbox_repository
        self._evaluations = evaluation_repository
        self._max_transaction_amount_cents = max_transaction_amount_cents
        self._max_daily_amount_cents = max_daily_amount_cents

    def execute(self, request: PaymentRiskEvaluationRequest) -> RiskDecision:
        today = datetime.now(timezone.utc).date()
        decision = self._evaluate(request, today)
        risk_evaluations_total.labels(outcome=decision.outcome.value).inc()

        self._evaluations.record_evaluation(
            payment_id=request.payment_id,
            source_account_id=request.source_account_id,
            amount_cents=request.amount,
            outcome=decision.outcome.value,
            day=today,
        )

        evaluation_id = str(ULID())
        now = datetime.now(timezone.utc).isoformat()

        if decision.outcome is RiskOutcome.APPROVED:
            event_type = "PaymentApprovedByRisk"
            data = {
                "paymentId": request.payment_id,
                "evaluationId": evaluation_id,
                "riskScore": decision.score,
                "approvedAt": now,
            }
        else:
            event_type = "PaymentRejectedByRisk"
            data = {
                "paymentId": request.payment_id,
                "evaluationId": evaluation_id,
                "riskScore": decision.score,
                "reason": decision.reason,
                "rejectedAt": now,
            }

        envelope = build_event_envelope(event_type, request.payment_id, data)
        self._outbox.save(OutboxEvent.pending(request.payment_id, event_type, json.dumps(envelope)))

        return decision

    def _evaluate(self, request: PaymentRiskEvaluationRequest, today) -> RiskDecision:
        if request.amount > self._max_transaction_amount_cents:
            return RiskDecision(RiskOutcome.REJECTED, score=90, reason="AMOUNT_EXCEEDS_TRANSACTION_LIMIT")

        already_approved_today = self._evaluations.sum_approved_amount_today(request.source_account_id, today)
        if already_approved_today + request.amount > self._max_daily_amount_cents:
            return RiskDecision(RiskOutcome.REJECTED, score=80, reason="AMOUNT_EXCEEDS_DAILY_LIMIT")

        return RiskDecision(RiskOutcome.APPROVED, score=10, reason=None)
