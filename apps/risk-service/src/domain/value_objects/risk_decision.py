from dataclasses import dataclass
from enum import Enum
from typing import Optional


class RiskOutcome(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


@dataclass(frozen=True)
class RiskDecision:
    outcome: RiskOutcome
    score: int
    reason: Optional[str] = None
