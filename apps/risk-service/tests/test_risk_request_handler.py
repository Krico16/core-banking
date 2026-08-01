import json

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from infrastructure.messaging.risk_request_handler import RiskRequestHandler
from infrastructure.persistence.models import Base, OutboxEventModel, ProcessedEventModel, RiskEvaluationModel


@pytest.fixture
def sqlite_session_factory(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    monkeypatch.setattr("infrastructure.messaging.risk_request_handler.SessionLocal", factory)
    return factory


def make_envelope(event_id: str, amount: int = 10_000) -> bytes:
    envelope = {
        "eventId": event_id,
        "eventType": "PaymentRiskEvaluationRequested",
        "data": {
            "paymentId": "pay_1",
            "sourceAccountId": "acc-source",
            "targetAccountId": "acc-target",
            "amount": amount,
            "currency": "EUR",
        },
    }
    return json.dumps(envelope).encode("utf-8")


def test_evaluates_and_publishes_and_marks_processed(sqlite_session_factory):
    handler = RiskRequestHandler(max_transaction_amount_cents=1_000_000, max_daily_amount_cents=5_000_000)

    handler.handle(make_envelope("evt-1"))

    with sqlite_session_factory() as session:
        assert session.get(ProcessedEventModel, "evt-1") is not None
        outbox_rows = session.query(OutboxEventModel).all()
        assert len(outbox_rows) == 1
        assert outbox_rows[0].event_type == "PaymentApprovedByRisk"
        evaluations = session.query(RiskEvaluationModel).all()
        assert len(evaluations) == 1


def test_skips_already_processed_event(sqlite_session_factory):
    handler = RiskRequestHandler(max_transaction_amount_cents=1_000_000, max_daily_amount_cents=5_000_000)

    handler.handle(make_envelope("evt-2"))
    handler.handle(make_envelope("evt-2"))  # redelivery

    with sqlite_session_factory() as session:
        outbox_rows = session.query(OutboxEventModel).all()
        assert len(outbox_rows) == 1  # not double-published
        evaluations = session.query(RiskEvaluationModel).all()
        assert len(evaluations) == 1  # not double-counted toward daily limit


def test_ignores_events_of_other_types(sqlite_session_factory):
    handler = RiskRequestHandler(max_transaction_amount_cents=1_000_000, max_daily_amount_cents=5_000_000)
    envelope = json.dumps({"eventId": "evt-3", "eventType": "PaymentCreated", "data": {}}).encode("utf-8")

    handler.handle(envelope)

    with sqlite_session_factory() as session:
        assert session.query(OutboxEventModel).count() == 0
        assert session.get(ProcessedEventModel, "evt-3") is None
