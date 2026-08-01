# Query Service

## Responsabilidades

- Mantener proyecciones de lectura (CQRS) alimentadas por los eventos de los otros
  4 servicios: `AccountView`, `TransactionView`, `PaymentView`, `CustomerDashboard`
- Exponer APIs de solo lectura rápidas sobre esas proyecciones
- Consumidor terminal: nunca escribe de vuelta a los servicios origen, no emite
  eventos de dominio propios

## Tecnologías

- TypeScript / NestJS
- TypeORM / PostgreSQL (`query_db`)
- KafkaJS → Redpanda (solo consumidor, 4 topics)
- Arquitectura hexagonal (Ports & Adapters)

## Arquitectura hexagonal

```
apps/query-service/src/
├── domain/
│   ├── entities/         # AccountView, TransactionView, PaymentView, CustomerDashboard
│   └── ports/            # un repository port por proyección
├── application/
│   ├── use-cases/
│   │   ├── record-customer-registered.use-case.ts
│   │   ├── record-account-opened.use-case.ts      # AccountView + CustomerDashboard.accountCount
│   │   ├── update-account-balance.use-case.ts
│   │   ├── record-ledger-transaction.use-case.ts   # posted -> filas de TransactionView
│   │   ├── reverse-ledger-transaction.use-case.ts  # reversed -> nuevas filas + marca REVERSED
│   │   ├── upsert-payment-view.use-case.ts         # los 6 eventos de pago
│   │   ├── get-account-view.use-case.ts
│   │   ├── get-payment-view.use-case.ts
│   │   └── get-customer-dashboard.use-case.ts
│   ├── services/         # findCounterpartAccount (función pura compartida)
│   └── dto/
├── infrastructure/
│   ├── persistence/      # ORM entities (account_views, transaction_views, payment_views,
│   │                     #  customer_dashboards, processed_events), mappers, repos
│   ├── messaging/         # CustomerEventConsumer, AccountEventConsumer, LedgerEventConsumer,
│   │                      #  PaymentEventConsumer
│   └── config/
└── presentation/
    └── controllers/       # HealthController, AccountsController, PaymentsController,
                            #  CustomersController
```

Sin outbox propio (igual que notification-service): este servicio es un consumidor
terminal, no emite eventos de dominio.

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/accounts/:accountId` | `AccountView` (saldo actual) | No (MVP) |
| GET | `/api/accounts/:accountId/transactions` | Historial de `TransactionView` de esa cuenta | No (MVP) |
| GET | `/api/payments/:paymentId` | `PaymentView` (estado actual del pago) | No (MVP) |
| GET | `/api/customers/:customerId/dashboard` | `CustomerDashboard` + lista de `AccountView` del cliente | No (MVP) |
| GET | `/api/health` | Health check (Terminus + ping DB) | No |

No hay endpoints de escritura: todo el flujo se dispara por eventos de Kafka.
Búsqueda por `correlationId` y generación de extractos (mencionados en
`docs/architecture/bounded-contexts.md` sección 7) se difieren (YAGNI): con
`correlationId` = `paymentId` en el diseño actual de payment-service, una búsqueda
dedicada no aporta sobre el lookup directo por id; extractos es una feature completa
aparte, no un requisito para que el servicio sea útil hoy.

## Eventos consumidos

| Topic | Evento | Proyección afectada | Acción |
|-------|--------|----------------------|--------|
| `banking.customer.events` | `CustomerRegistered` | `CustomerDashboard` | Crea el dashboard del cliente |
| `banking.account.events` | `AccountOpened` | `AccountView`, `CustomerDashboard` | Crea la vista de cuenta (saldo 0); incrementa `accountCount` del dashboard |
| `banking.ledger.events` | `LedgerTransactionPosted` | `TransactionView` | Una fila por cuenta participante del asiento |
| `banking.ledger.events` | `LedgerTransactionReversed` | `TransactionView` | Inserta filas nuevas para la reversa; marca las filas del `originalEntryId` como `REVERSED` |
| `banking.ledger.events` | `AccountBalanceChanged` | `AccountView` | Actualiza el saldo actual |
| `banking.payment.events` | `PaymentCreated` / `PaymentAuthorized` / `PaymentCompleted` / `PaymentRejected` / `PaymentFailed` / `PaymentReversed` | `PaymentView` | Upsert por `paymentId` con el snapshot completo del evento |

`PaymentEventConsumer` está deliberadamente ampliado a los 6 tipos de evento de pago,
más allá de la lista literal de 4 que menciona `bounded-contexts.md`: los 6 comparten
el mismo shape completo (`buildPaymentEventEnvelope`), así que hacer upsert en cada
uno mantiene `PaymentView` siempre al día sin lógica incremental por tipo.

Límite conocido, no bloqueante: si `AccountOpened` llega antes que
`CustomerRegistered` (orden de entrega no garantizado entre topics distintos), el
incremento de `accountCount` se ignora silenciosamente — no hay agregado todavía
que incrementar. Se pierde el conteo de esa cuenta hasta que se decida si vale la
pena reconciliar.

Cuatro consumidores explícitos (uno por topic), idempotencia vía `processed_events`
— mismo patrón que los consumidores de account-service, ledger-service,
payment-service y notification-service (regla nº4 AGENTS.md).

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3008` | Puerto HTTP |
| `DATABASE_HOST` | `localhost` | Host PostgreSQL |
| `DATABASE_PORT` | `5432` | Puerto PG |
| `DATABASE_NAME` | `query_db` | Base de datos |
| `DATABASE_USERNAME` / `DATABASE_PASSWORD` | `postgres` / `postgres` | Credenciales |
| `REDPANDA_BROKERS` | `localhost:19092` | Bootstrap Kafka |
| `REDPANDA_TOPIC_CUSTOMER_EVENTS` | `banking.customer.events` | Topic consumido por `CustomerEventConsumer` |
| `REDPANDA_TOPIC_ACCOUNT_EVENTS` | `banking.account.events` | Topic consumido por `AccountEventConsumer` |
| `REDPANDA_TOPIC_LEDGER_EVENTS` | `banking.ledger.events` | Topic consumido por `LedgerEventConsumer` |
| `REDPANDA_TOPIC_PAYMENT_EVENTS` | `banking.payment.events` | Topic consumido por `PaymentEventConsumer` |

## Comandos

```bash
# Docker (recomendado)
docker compose -f compose.yaml build query-service
docker compose -f compose.yaml up -d query-service

# Local
cd apps/query-service
npm install && npm run migration:run && npm run start:dev

# Tests unitarios (sin Postgres/Kafka reales)
npm test
```

## Reglas de negocio (checklist AGENTS.md)

- [x] Idempotencia (`processed_events`, un `event_id` no se reprocesa)
- [x] BD propia (`query_db`)
- [x] Hexagonal
- [N/A] Partida doble / dinero sin float — no aplica, este servicio solo proyecta datos ya validados
- [ ] Auth servicio-a-servicio (fase gateway)
- [ ] Tests de integración / cobertura 80%+
- [ ] Extractos y búsqueda por correlationId — diferido hasta que haga falta
