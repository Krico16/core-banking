# Risk Service

## Responsabilidades

- Evaluar el riesgo de una transferencia antes de que el ledger la contabilice
- Reglas deterministas mínimas viables (no ML): límite fijo por transacción, límite
  diario acumulado por cuenta origen (solo sobre transacciones ya aprobadas)
- Publicar la decisión (`PaymentApprovedByRisk`/`PaymentRejectedByRisk`) vía
  transactional outbox propio

## Tecnologías

- Python 3.13 / FastAPI (solo para `/health`; el flujo principal es 100% por eventos)
- SQLAlchemy 2.x (sync) + psycopg2 / PostgreSQL (`risk_db`)
- Alembic (migraciones)
- confluent-kafka (consumidor + productor)
- Arquitectura hexagonal (Ports & Adapters)

## Arquitectura hexagonal

```
apps/risk-service/src/
├── domain/
│   ├── entities/         # OutboxEvent
│   ├── value_objects/    # RiskDecision, RiskOutcome
│   └── ports/            # OutboxEventRepository, RiskEvaluationRepository (Protocol)
├── application/
│   ├── use_cases/         # EvaluatePaymentRiskUseCase
│   └── services/           # build_event_envelope
├── infrastructure/
│   ├── config/            # Settings (pydantic-settings)
│   ├── persistence/       # SQLAlchemy models, repos, db session factory
│   └── messaging/         # kafka_consumer, kafka_producer, outbox_publisher_worker, risk_request_handler
└── presentation/
    └── health.py            # FastAPI /health, /ready
```

Outbox worker corre en un hilo daemon separado del event loop de FastAPI (mismo
patrón de polling que ledger-service y los servicios NestJS: `SELECT ... FOR UPDATE
SKIP LOCKED`, batch 100, maxRetries 10).

## Eventos consumidos

| Topic | Evento | Acción |
|-------|--------|--------|
| `banking.payment.risk-requests` | `PaymentRiskEvaluationRequested` | Evalúa las reglas, registra la evaluación, publica la decisión |

## Eventos emitidos

| Topic | Evento | Cuándo |
|-------|--------|--------|
| `banking.risk.events` | `PaymentApprovedByRisk` | Monto ≤ límite por transacción y el acumulado diario aprobado no excede el límite |
| `banking.risk.events` | `PaymentRejectedByRisk` | Excede el límite por transacción (`AMOUNT_EXCEEDS_TRANSACTION_LIMIT`) o el diario acumulado (`AMOUNT_EXCEEDS_DAILY_LIMIT`) |

Idempotencia vía `processed_events` (mismo `eventId` no se reevalúa ni duplica la
respuesta).

**No implementado (fuera del mínimo viable acordado)**: lista de bloqueo de cuentas,
detección de velocidad de transacciones (N pagos en X minutos). Agregar si se
necesitan reglas más finas — la interfaz `RiskEvaluationRepository`/
`EvaluatePaymentRiskUseCase` no necesita romperse para incorporarlas.

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3006` | Puerto HTTP (solo health) |
| `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_USERNAME` / `DATABASE_PASSWORD` / `DATABASE_NAME` | `localhost` / `5432` / `postgres` / `postgres` / `risk_db` | Conexión Postgres |
| `REDPANDA_BROKERS` | `localhost:19092` | Bootstrap Kafka |
| `RISK_REQUESTS_TOPIC` | `banking.payment.risk-requests` | Topic consumido |
| `RISK_EVENTS_TOPIC` | `banking.risk.events` | Topic publicado |
| `MAX_TRANSACTION_AMOUNT_CENTS` | `1000000` (10,000.00) | Límite por transacción |
| `MAX_DAILY_AMOUNT_CENTS` | `5000000` (50,000.00) | Límite diario acumulado por cuenta |

## Comandos

```bash
# Docker (recomendado)
docker compose -f compose.yaml build risk-service
docker compose -f compose.yaml up -d risk-service

# Local — ver apps/risk-service/README.md para el detalle completo
cd apps/risk-service
python -m venv .venv
./.venv/Scripts/pip install -r requirements-dev.txt
./.venv/Scripts/python -m pytest
PYTHONPATH=src ./.venv/Scripts/python -m uvicorn main:app --reload --port 3006
```

## Reglas de negocio (checklist AGENTS.md)

- [x] Idempotencia (`processed_events`)
- [x] Transactional outbox
- [x] BD propia (`risk_db`)
- [x] Hexagonal
- [ ] Auth servicio-a-servicio (fase gateway)
- [ ] Tests de integración / cobertura 80%+ (hoy: 10 tests unitarios con SQLite en
  memoria y mocks, sin Postgres/Kafka reales)
