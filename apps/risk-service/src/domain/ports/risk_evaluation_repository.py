from datetime import date
from typing import Protocol


class RiskEvaluationRepository(Protocol):
    def sum_approved_amount_today(self, source_account_id: str, day: date) -> int: ...

    def record_evaluation(
        self,
        payment_id: str,
        source_account_id: str,
        amount_cents: int,
        outcome: str,
        day: date,
    ) -> None: ...
