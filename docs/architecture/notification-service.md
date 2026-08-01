# Notification Service

## Responsabilidades

- Consumir eventos de dominio relevantes y notificar al cliente afectado
- Un solo canal en el MVP: `LOG` (simula el envío, sin motor de plantillas)
- Idempotencia: no notificar dos veces el mismo evento

## Tecnologías

- TypeScript / NestJS
- TypeORM / PostgreSQL (`notification_db`)
- KafkaJS → Redpanda (solo consumidor, no produce eventos de dominio)
- Arquitectura hexagonal (Ports & Adapters)

## Arquitectura hexagonal

```
apps/notification-service/src/
├── domain/
│   ├── entities/         # Notification
│   ├── value-objects/    # NotificationChannel (LOG)
│   └── ports/            # NotificationRepository, NotificationSender
├── application/
│   ├── use-cases/        # NotifyCustomerUseCase
│   ├── services/         # buildNotificationMessage (función pura, sin motor de templates)
│   └── dto/
├── infrastructure/
│   ├── persistence/      # ORM entities (notifications, processed_events), repo
│   ├── notification/     # LogNotificationSender (único canal del MVP)
│   ├── messaging/        # PaymentEventConsumer, AccountEventConsumer, CustomerEventConsumer
│   └── config/
└── presentation/
    └── controllers/      # HealthController, NotificationsController (solo lectura)
```

No hay un motor de plantillas (`Template`/`Preference` como entidades de dominio) —
diseño de fase 0 más ambicioso de lo necesario hoy. El mensaje se arma con un switch
simple por `eventType` en `buildNotificationMessage`. Si hace falta personalización
real más adelante, se puede introducir sin romper `NotificationSender`.

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/notifications/:subjectId` | Notificaciones enviadas a un subject (customerId o paymentId según el evento) | No (MVP) |
| GET | `/api/health` | Health check (Terminus + ping DB) | No |
| GET | `/api/health/ready` | Readiness | No |

No hay endpoints de escritura: todo el flujo se dispara por eventos de Kafka.

## Eventos consumidos

| Topic | Evento | subjectId usado | Acción |
|-------|--------|------------------|--------|
| `banking.payment.events` | `PaymentCompleted` | `paymentId` | Notifica "Payment {id} completed: {amount} {currency}" |
| `banking.payment.events` | `PaymentRejected` | `paymentId` | Notifica "Payment {id} rejected: {reason}" |
| `banking.account.events` | `AccountOpened` | `customerId` | Notifica "Account {accountNumber} opened" |
| `banking.customer.events` | `CustomerSuspended` | `customerId` | Notifica "Your account access has been suspended: {reason}" |

Cualquier otro `eventType` en esos topics (`PaymentCreated`, `AccountFrozen`,
`CustomerRegistered`, etc.) se ignora — `buildNotificationMessage` devuelve `null` y
el consumidor no lo marca en `processed_events` (solo se registra idempotencia para
eventos que sí generan notificación).

Tres consumidores explícitos (uno por topic), cada uno con su propio
`groupId` (`notification-service-payment`/`-account`/`-customer`) e idempotencia vía
`processed_events` — mismo patrón que los consumidores de account-service,
ledger-service y payment-service (regla nº4 AGENTS.md).

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3007` | Puerto HTTP |
| `DATABASE_HOST` | `localhost` | Host PostgreSQL |
| `DATABASE_PORT` | `5432` | Puerto PG |
| `DATABASE_NAME` | `notification_db` | Base de datos |
| `DATABASE_USERNAME` / `DATABASE_PASSWORD` | `postgres` / `postgres` | Credenciales |
| `REDPANDA_BROKERS` | `localhost:19092` | Bootstrap Kafka |
| `REDPANDA_TOPIC_PAYMENT_EVENTS` | `banking.payment.events` | Topic consumido por `PaymentEventConsumer` |
| `REDPANDA_TOPIC_ACCOUNT_EVENTS` | `banking.account.events` | Topic consumido por `AccountEventConsumer` |
| `REDPANDA_TOPIC_CUSTOMER_EVENTS` | `banking.customer.events` | Topic consumido por `CustomerEventConsumer` |

## Comandos

```bash
# Docker (recomendado)
docker compose -f compose.yaml build notification-service
docker compose -f compose.yaml up -d notification-service

# Local
cd apps/notification-service
npm install && npm run migration:run && npm run start:dev

# Tests unitarios (sin Postgres/Kafka reales)
npm test
```

## Reglas de negocio (checklist AGENTS.md)

- [x] Idempotencia (`processed_events`, un `event_id` no se reprocesa)
- [x] BD propia (`notification_db`)
- [x] Hexagonal
- [N/A] Partida doble / dinero sin float — no aplica, este servicio no toca saldos
- [ ] Auth servicio-a-servicio (fase gateway)
- [ ] Tests de integración / cobertura 80%+
- [ ] Canales reales (SMTP/SMS/push) — diferido hasta que haga falta uno real
