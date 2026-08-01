from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ulid import ULID

from infrastructure.persistence.models import RiskEvaluationModel


class SqlAlchemyRiskEvaluationRepository:
    """No hace commit — mismo motivo que SqlAlchemyOutboxEventRepository."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def sum_approved_amount_today(self, source_account_id: str, day: date) -> int:
        stmt = select(func.coalesce(func.sum(RiskEvaluationModel.amount_cents), 0)).where(
            RiskEvaluationModel.source_account_id == source_account_id,
            RiskEvaluationModel.evaluation_date == day,
            RiskEvaluationModel.outcome == "APPROVED",
        )
        return int(self._session.scalar(stmt) or 0)

    def record_evaluation(
        self,
        payment_id: str,
        source_account_id: str,
        amount_cents: int,
        outcome: str,
        day: date,
    ) -> None:
        self._session.add(
            RiskEvaluationModel(
                id=str(ULID()),
                payment_id=payment_id,
                source_account_id=source_account_id,
                amount_cents=amount_cents,
                outcome=outcome,
                evaluation_date=day,
                created_at=datetime.now(timezone.utc),
            )
        )
