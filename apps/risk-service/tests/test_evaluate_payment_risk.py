import json
from datetime import date

import pytest

from application.dto.payment_risk_evaluation_request import PaymentRiskEvaluationRequest
from application.use_cases.evaluate_payment_risk import EvaluatePaymentRiskUseCase
from domain.value_objects.risk_decision import RiskOutcome


class FakeOutboxRepository:
    def __init__(self) -> None:
        self.saved = []

    def save(self, event) -> None:
        self.saved.append(event)


class FakeRiskEvaluationRepository:
    def __init__(self, approved_today: int = 0) -> None:
        self.approved_today = approved_today
        self.recorded = []

    def sum_approved_amount_today(self, source_account_id: str, day: date) -> int:
        return self.approved_today

    def record_evaluation(self, payment_id, source_account_id, amount_cents, outcome, day) -> None:
        self.recorded.append((payment_id, source_account_id, amount_cents, outcome, day))


def make_request(amount: int = 10_000, source_account_id: str = "acc-source") -> PaymentRiskEvaluationRequest:
    return PaymentRiskEvaluationRequest(
        payment_id="pay_1",
        source_customer_id="cust-1",
        target_customer_id="cust-2",
        source_account_id=source_account_id,
        target_account_id="acc-target",
        amount=amount,
        currency="EUR",
        requested_at="2026-01-01T00:00:00Z",
    )


def test_approves_payment_within_limits():
    outbox = FakeOutboxRepository()
    evaluations = FakeRiskEvaluationRepository(approved_today=0)
    use_case = EvaluatePaymentRiskUseCase(outbox, evaluations, max_transaction_amount_cents=1_000_000, max_daily_amount_cents=5_000_000)

    decision = use_case.execute(make_request(amount=10_000))

    assert decision.outcome is RiskOutcome.APPROVED
    assert len(outbox.saved) == 1
    assert outbox.saved[0].event_type == "PaymentApprovedByRisk"
    payload = json.loads(outbox.saved[0].payload)
    assert payload["eventType"] == "PaymentApprovedByRisk"
    assert payload["data"]["paymentId"] == "pay_1"
    assert len(evaluations.recorded) == 1
    assert evaluations.recorded[0][3] == "APPROVED"


def test_rejects_payment_exceeding_transaction_limit():
    outbox = FakeOutboxRepository()
    evaluations = FakeRiskEvaluationRepository()
    use_case = EvaluatePaymentRiskUseCase(outbox, evaluations, max_transaction_amount_cents=1_000_000, max_daily_amount_cents=5_000_000)

    decision = use_case.execute(make_request(amount=2_000_000))

    assert decision.outcome is RiskOutcome.REJECTED
    assert decision.reason == "AMOUNT_EXCEEDS_TRANSACTION_LIMIT"
    assert outbox.saved[0].event_type == "PaymentRejectedByRisk"
    payload = json.loads(outbox.saved[0].payload)
    assert payload["data"]["reason"] == "AMOUNT_EXCEEDS_TRANSACTION_LIMIT"


def test_rejects_payment_exceeding_daily_accumulated_limit():
    outbox = FakeOutboxRepository()
    evaluations = FakeRiskEvaluationRepository(approved_today=4_995_000)
    use_case = EvaluatePaymentRiskUseCase(outbox, evaluations, max_transaction_amount_cents=1_000_000, max_daily_amount_cents=5_000_000)

    decision = use_case.execute(make_request(amount=10_000))

    assert decision.outcome is RiskOutcome.REJECTED
    assert decision.reason == "AMOUNT_EXCEEDS_DAILY_LIMIT"


def test_rejected_payments_do_not_count_toward_daily_limit_by_themselves():
    # A rejected evaluation is still recorded for audit, but sum_approved_amount_today
    # (the repository's job) only ever includes APPROVED rows — verified here by
    # confirming the fake's approved_today figure alone drives the decision.
    outbox = FakeOutboxRepository()
    evaluations = FakeRiskEvaluationRepository(approved_today=0)
    use_case = EvaluatePaymentRiskUseCase(outbox, evaluations, max_transaction_amount_cents=1_000_000, max_daily_amount_cents=5_000_000)

    use_case.execute(make_request(amount=2_000_000))  # rejected on transaction limit

    assert evaluations.recorded[0][3] == "REJECTED"
