# risk-service

Evaluación de riesgo de pagos (fase 7). Python/FastAPI, arquitectura hexagonal, transactional
outbox propio (mismo patrón que `ledger-service` y el resto de servicios NestJS).

## Qué hace

Consume `PaymentRiskEvaluationRequested` (topic `banking.payment.risk-requests`), aplica reglas
deterministas mínimas (no ML: límite fijo por transacción, límite diario acumulado por cuenta
origen sobre transacciones ya aprobadas) y publica `PaymentApprovedByRisk` o
`PaymentRejectedByRisk` (topic `banking.risk.events`) vía outbox.

Idempotente: cada `eventId` procesado se registra en `processed_events`; redeliveries de Kafka
no re-evalúan ni duplican el evento de respuesta.

## Desarrollo local

```bash
python -m venv .venv
./.venv/Scripts/pip install -r requirements-dev.txt   # Windows
# ./.venv/bin/pip install -r requirements-dev.txt     # Linux/macOS

# Tests (no requieren Postgres/Kafka — usan SQLite en memoria y mocks)
./.venv/Scripts/python -m pytest

# Migraciones (requiere Postgres corriendo, ver compose.yaml)
./.venv/Scripts/python -m alembic upgrade head

# Levantar el servicio
PYTHONPATH=src ./.venv/Scripts/python -m uvicorn main:app --reload --port 3006
```

## Variables de entorno

| Variable | Default |
|---|---|
| `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_USERNAME` / `DATABASE_PASSWORD` / `DATABASE_NAME` | `localhost` / `5432` / `postgres` / `postgres` / `risk_db` |
| `REDPANDA_BROKERS` | `localhost:19092` |
| `RISK_REQUESTS_TOPIC` | `banking.payment.risk-requests` |
| `RISK_EVENTS_TOPIC` | `banking.risk.events` |
| `MAX_TRANSACTION_AMOUNT_CENTS` | `1000000` (10,000.00) |
| `MAX_DAILY_AMOUNT_CENTS` | `5000000` (50,000.00) |
| `PORT` | `3006` |

## Estructura

```
src/
├── domain/          # OutboxEvent, RiskDecision, ports (Protocol)
├── application/      # EvaluatePaymentRiskUseCase, DTOs, envelope builder
├── infrastructure/    # SQLAlchemy repos, Kafka consumer/producer, outbox worker, settings
└── presentation/      # FastAPI health/ready routes
```
