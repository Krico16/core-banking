from prometheus_client import Counter

risk_evaluations_total = Counter(
    "banking_risk_evaluations_total",
    "Payment risk evaluations by outcome (APPROVED/REJECTED)",
    ["outcome"],
)
