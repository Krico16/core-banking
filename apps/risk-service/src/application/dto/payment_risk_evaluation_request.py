from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class PaymentRiskEvaluationRequest:
    payment_id: str
    source_customer_id: Optional[str]
    target_customer_id: Optional[str]
    source_account_id: str
    target_account_id: str
    amount: int
    currency: str
    requested_at: Optional[str]
