from unittest.mock import MagicMock

import pytest

from infrastructure.messaging.outbox_publisher_worker import OutboxPublisherWorker


def make_session_with_rows(rows):
    session = MagicMock()
    session.execute.return_value.mappings.return_value.all.return_value = rows
    session.__enter__.return_value = session
    session.__exit__.return_value = False
    return session


@pytest.fixture(autouse=True)
def patch_session_local(monkeypatch):
    def _patch(session):
        monkeypatch.setattr(
            "infrastructure.messaging.outbox_publisher_worker.SessionLocal",
            MagicMock(return_value=session),
        )

    return _patch


def test_publishes_pending_event_successfully(patch_session_local):
    row = {"id": "evt-1", "aggregate_id": "pay_1", "event_type": "PaymentApprovedByRisk", "payload": "{}", "retry_count": 0}
    session = make_session_with_rows([row])
    patch_session_local(session)

    producer = MagicMock()
    worker = OutboxPublisherWorker(producer, "banking.risk.events")

    worker.publish_pending_events()

    producer.send.assert_called_once_with("banking.risk.events", key="pay_1", value="{}")
    update_calls = [c for c in session.execute.call_args_list if "UPDATE" in str(c.args[0])]
    assert any("PUBLISHED" in str(c.args[1]) or "PUBLISHED" in str(c.args[0]) for c in update_calls)
    session.commit.assert_called_once()


def test_marks_pending_and_increments_retry_on_send_failure(patch_session_local):
    row = {"id": "evt-2", "aggregate_id": "pay_2", "event_type": "PaymentApprovedByRisk", "payload": "{}", "retry_count": 3}
    session = make_session_with_rows([row])
    patch_session_local(session)

    producer = MagicMock()
    producer.send.side_effect = RuntimeError("broker unreachable")
    worker = OutboxPublisherWorker(producer, "banking.risk.events")

    worker.publish_pending_events()

    update_call = session.execute.call_args_list[-1]
    params = update_call.args[1]
    assert params["status"] == "PENDING"
    assert params["retry_count"] == 4
    assert "broker unreachable" in params["error"]


def test_marks_failed_once_max_retries_reached(patch_session_local):
    row = {"id": "evt-3", "aggregate_id": "pay_3", "event_type": "PaymentApprovedByRisk", "payload": "{}", "retry_count": 9}
    session = make_session_with_rows([row])
    patch_session_local(session)

    producer = MagicMock()
    producer.send.side_effect = RuntimeError("still down")
    worker = OutboxPublisherWorker(producer, "banking.risk.events")

    worker.publish_pending_events()

    update_call = session.execute.call_args_list[-1]
    params = update_call.args[1]
    assert params["status"] == "FAILED"
    assert params["retry_count"] == 10
