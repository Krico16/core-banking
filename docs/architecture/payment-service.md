# Payment Service

## Responsabilidades

- Orquestador de transferencias entre cuentas (Saga)
- Máquina de estados del pago: CREATED → VALIDATING → RISK_REVIEW → AUTHORIZED → POSTING → COMPLETED
- Publica eventos de pago vía transactional outbox (mismo patrón que ledger-service)
- Solicita evaluación de riesgo real a risk-service (`PaymentRiskEvaluationRequested` /
  `PaymentApprovedByRisk` / `PaymentRejectedByRisk`) — el saga se detiene en RISK_REVIEW
  hasta recibir la respuesta async
- Consume eventos del ledger (`LedgerTransactionPosted`, `LedgerTransactionRejected`,
  `LedgerTransactionReversed`) como registro de auditoría (el driver de completado sigue
  siendo la respuesta síncrona de `POST /ledger/transfer`)
- Reversión de pagos completados (llama a `ledger-service /reverse` de verdad)
- Idempotencia por `Idempotency-Key`

## Tecnologías

- TypeScript / NestJS
- TypeORM / PostgreSQL (`payment_db`)
- KafkaJS → Redpanda
- Arquitectura Hexagonal (Ports & Adapters)

## Arquitectura hexagonal

```
apps/payment-service/src/
├── domain/
│   ├── entities/         # Payment (state machine) + OutboxEvent
│   ├── value-objects/    # Money, PaymentStatus, VALID_TRANSITIONS
│   ├── ports/            # PaymentRepository, OutboxEventRepository, TransactionRunner, LedgerClient
│   └── exceptions/
├── application/
│   ├── use-cases/        # CreatePayment, AdvancePayment, ReversePayment, GetPayment
│   ├── saga/             # PaymentSagaOrchestrator
│   ├── service/          # buildPaymentEventEnvelope
│   └── dto/
├── infrastructure/
│   ├── persistence/      # ORM entities (payment, outbox_events, processed_events), repos, TypeOrmTransactionRunner
│   ├── messaging/        # KafkaEventPublisher (sendRaw only), OutboxPublisherWorker, LedgerEventConsumer, RiskEventConsumer
│   ├── http/             # LedgerHttpClient
│   └── config/
└── presentation/
    ├── controllers/
    └── dto/
```

No hay una carpeta `domain/events/` — desde que se migró a outbox, cada use-case/paso del
saga construye el envelope inline (`buildPaymentEventEnvelope`) en vez de instanciar
clases de evento tipadas.

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/payments/transfer` | Crear transferencia (requiere `Idempotency-Key`) | No (MVP) |
| GET | `/api/payments/:id` | Consultar estado del pago | No |
| POST | `/api/payments/:id/advance` | Avanzar al siguiente estado | No |
| POST | `/api/payments/:id/authorize` | Avanzar a AUTHORIZED | No |
| POST | `/api/payments/:id/posting` | Avanzar a POSTING | No |
| POST | `/api/payments/:id/complete` | Completar con `ledgerEntryId` | No |
| POST | `/api/payments/:id/fail` | Marcar como fallido con `reason` | No |
| POST | `/api/payments/:id/reverse` | Revertir pago completado | No |
| GET | `/api/health` | Health check | No |
| GET | `/api/health/ready` | Readiness | No |

## Máquina de estados

```
CREATED → VALIDATING → RISK_REVIEW → AUTHORIZED → POSTING → COMPLETED → REVERSED
  ↓           ↓            ↓            ↓           ↓
FAILED     FAILED       FAILED       FAILED      FAILED
```

Transiciones válidas definidas en `VALID_TRANSITIONS`. Solo se puede revertir desde COMPLETED.

## Eventos a Redpanda

Todos se publican vía transactional outbox (insert en la misma transacción que el
cambio de estado; `OutboxPublisherWorker` los envía por separado). La mayoría van a
`banking.payment.events`; `PaymentRiskEvaluationRequested` tiene su propio topic.

| Evento | Topic | Disparador |
|--------|-------|----------|
| `PaymentCreated` | `banking.payment.events` | POST /api/payments/transfer |
| `PaymentRiskEvaluationRequested` | `banking.payment.risk-requests` | Saga: VALIDATING → RISK_REVIEW |
| `PaymentAuthorized` | `banking.payment.events` | Saga tras `PaymentApprovedByRisk`, o POST /advance |
| `PaymentRejected` | `banking.payment.events` | Saga tras `PaymentRejectedByRisk` |
| `PaymentCompleted` | `banking.payment.events` | Saga tras respuesta síncrona de ledger, o POST /complete |
| `PaymentFailed` | `banking.payment.events` | POST /fail o error en saga (ledger no disponible, etc.) |
| `PaymentReversed` | `banking.payment.events` | POST /:id/reverse |

Envelope estándar:

```json
{
  "eventId": "evt_...",
  "eventType": "PaymentCreated",
  "eventVersion": 1,
  "occurredAt": "2026-07-29T02:52:29.939Z",
  "producer": "payment-service",
  "correlationId": "pay_...",
  "causationId": "pay_...",
  "subjectId": "pay_...",
  "data": {
    "paymentId": "pay_...",
    "idempotencyKey": "...",
    "sourceAccountId": "ACC-001",
    "targetAccountId": "ACC-002",
    "amount": 10000,
    "currency": "EUR",
    "status": "CREATED",
    ...
  }
}
```

## Consumidores de eventos

| Topic | Evento | Acción |
|-------|--------|--------|
| `banking.risk.events` | `PaymentApprovedByRisk` | `RiskEventConsumer` → `saga.resumeAfterRiskApproval()`: RISK_REVIEW → AUTHORIZED → POSTING → COMPLETED |
| `banking.risk.events` | `PaymentRejectedByRisk` | `RiskEventConsumer` → `saga.handleRiskRejection()`: RISK_REVIEW → FAILED (reason del rechazo), emite `PaymentRejected` |
| `banking.ledger.events` | `LedgerTransactionPosted` / `LedgerTransactionRejected` / `LedgerTransactionReversed` | `LedgerEventConsumer`: registro de auditoría (log). El camino principal sigue siendo la respuesta síncrona de `POST /ledger/transfer`, no estos eventos. |

Ambos consumidores son idempotentes vía `processed_events` (mismo `event_id` no se
reprocesa).

## Flujo de saga (happy path, automático)

```
1. POST /api/payments/transfer → Payment CREATED, PaymentCreated (outbox)
2. Saga (async, setImmediate): CREATED → VALIDATING → RISK_REVIEW
   → publica PaymentRiskEvaluationRequested y SE DETIENE
3. risk-service evalúa, publica PaymentApprovedByRisk
4. RiskEventConsumer → saga.resumeAfterRiskApproval():
   RISK_REVIEW → AUTHORIZED (PaymentAuthorized)
   → POSTING → POST /ledger/transfer (síncrono, con paymentId)
   → COMPLETED (PaymentCompleted)
```

Los endpoints manuales (`/advance`, `/authorize`, `/posting`, `/complete`, `/fail`)
siguen existiendo para depuración/recuperación en desarrollo, pero el camino normal es
100% dirigido por eventos desde que se resolvió el stub de riesgo.

## Flujo de compensación

```
1. POST /:id/reverse
2. ledger.reverse() (síncrono, POST /api/ledger/reverse) — ya implementado, no es integración futura
3. Payment → REVERSED, PaymentReversed (outbox)
```

## Comandos

```bash
# Docker (recomendado)
docker compose -f compose.yaml build payment-service
docker compose -f compose.yaml up -d payment-service

# Local
cd apps/payment-service
npm install && npm run build && npm run start:dev
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3005` | Puerto HTTP |
| `DATABASE_HOST` | `localhost` | Host PostgreSQL |
| `DATABASE_PORT` | `5432` | Puerto PG |
| `DATABASE_NAME` | `payment_db` | Base de datos |
| `DATABASE_USERNAME` | `postgres` | Usuario |
| `DATABASE_PASSWORD` | `postgres` | Password |
| `REDPANDA_BROKERS` | `localhost:19092` | Bootstrap Kafka |
| `PAYMENT_EVENTS_TOPIC` | `banking.payment.events` | Topic de eventos de pago |
| `PAYMENT_RISK_REQUESTS_TOPIC` | `banking.payment.risk-requests` | Topic de `PaymentRiskEvaluationRequested` |
| `RISK_EVENTS_TOPIC` | `banking.risk.events` | Topic que consume `RiskEventConsumer` |
| `LEDGER_EVENTS_TOPIC` | `banking.ledger.events` | Topic que consume `LedgerEventConsumer` |
| `LEDGER_SERVICE_URL` | `http://localhost:3004` | Base URL de `LedgerHttpClient` |
| `LEDGER_TIMEOUT_MS` | `10000` | Timeout HTTP hacia ledger-service |
| `DATABASE_MIGRATIONS_RUN` | `false` | Ejecutar migraciones al arrancar |
| `NODE_ENV` | — | `development` habilita `synchronize` (fuera de dev usa migraciones) |

## Reglas de negocio

1. Cada payment tiene un `idempotencyKey` único
2. Source y target deben ser cuentas diferentes
3. El monto debe ser positivo (en centavos)
4. Solo se puede revertir un payment COMPLETED
5. Las transiciones de estado siguen la máquina definida
6. Los eventos se publican con envelope estándar

## Gaps conocidos

- Tests de integración (con Docker + ledger + risk-service reales) pendientes
- Auth servicio-a-servicio pendiente (fase gateway)
- El paso "post a ledger" sigue siendo síncrono (HTTP), no dirigido por el evento async
  `LedgerTransactionPosted` — decisión deliberada (ver `docs/ROADMAP.md`), no un gap.
