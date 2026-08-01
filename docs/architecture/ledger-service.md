# Ledger Service

## Responsabilidades

- Único dueño de saldos contables del core
- Partida doble obligatoria (Σ débitos = Σ créditos)
- Depósitos, retiros, transferencias y reversiones
- Multi-moneda (cuenta mono-moneda + caja del banco por divisa)
- Idempotencia por `Idempotency-Key`
- Transactional outbox → Redpanda
- Optimistic locking en cuentas (`@Version`)

## Tecnologías

- Java 21 / Spring Boot 3.3
- Spring Data JPA / PostgreSQL
- Flyway
- Spring Kafka → Redpanda
- BigDecimal (nunca float/double)
- Arquitectura hexagonal (Ports & Adapters)

## Arquitectura hexagonal

```
apps/ledger-service/src/main/java/com/banking/ledger/
├── domain/
│   ├── model/          # LedgerAccount, JournalEntry, LedgerEntry
│   ├── vo/             # Money, Currency, IdempotencyKey, IDs, enums
│   ├── port/           # LedgerAccountRepository, JournalEntryRepository, OutboxEventRepository
│   ├── service/        # BankCashAccountResolver
│   ├── event/          # DomainEvent (sealed)
│   └── exception/      # DomainException hierarchy (sin Spring)
├── application/
│   ├── usecase/        # Deposit, Withdraw, Transfer, Reverse, CreateAccount, GetBalance
│   ├── service/        # EventEnvelopeFactory, TransactionResultMapper
│   └── dto/
├── infrastructure/
│   ├── persistence/    # JPA entities, mappers, repos
│   ├── messaging/      # OutboxPublisherWorker, KafkaEventPublisher
│   └── config/
└── presentation/
    └── controller/     # LedgerController, HealthController, GlobalExceptionHandler
```

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/ledger/accounts` | Crear cuenta ledger (ASSET/LIABILITY) | No (MVP) |
| GET | `/api/ledger/accounts/{accountId}/balance` | Consultar saldo | No (MVP) |
| POST | `/api/ledger/deposit` | Depósito (requiere `Idempotency-Key`) | No (MVP) |
| POST | `/api/ledger/withdraw` | Retiro (requiere `Idempotency-Key`) | No (MVP) |
| POST | `/api/ledger/transfer` | Transferencia misma moneda (acepta `paymentId` opcional) | No (MVP) |
| POST | `/api/ledger/reverse` | Reversión de asiento | No (MVP) |
| GET | `/api/ledger/currencies` | Monedas soportadas | No |
| GET | `/api/health` | Health check | No |
| GET | `/api/ready` | Readiness | No |

> Auth servicio-a-servicio queda para fase de gateway/hardening. En MVP el ledger es interno a la red Docker.

## Contabilidad

### Tipos de cuenta

| Tipo | Débito | Crédito | Uso |
|------|--------|---------|-----|
| **ASSET** | ↑ aumenta | ↓ disminuye | Caja del banco (`BANK_CASH_{CCY}`) |
| **LIABILITY** | ↓ disminuye | ↑ aumenta | Cuentas de clientes |

### Operaciones

| Operación | Débito | Crédito |
|-----------|--------|---------|
| **Deposit** | `BANK_CASH_{CCY}` (ASSET) | Cuenta cliente (LIABILITY) |
| **Withdraw** | Cuenta cliente (LIABILITY) | `BANK_CASH_{CCY}` (ASSET) |
| **Transfer** | Origen (LIABILITY) | Destino (LIABILITY) |
| **Reverse** | Invierte débitos/créditos del asiento original | |

### Invariantes

1. Toda `JournalEntry` tiene ≥ 1 DEBIT y ≥ 1 CREDIT
2. Σ débitos = Σ créditos (misma moneda en todas las líneas)
3. Asientos publicados son inmutables; errores → reversión
4. Solo ledger-service escribe saldos
5. Money = `BigDecimal` scale 4 + ISO 4217

## Multi-moneda

Monedas soportadas:

```
EUR, USD, GBP, CHF, JPY, MXN, COP, ARS, CLP, BRL, PEN
```

Reglas:

- Cada cuenta ledger es **mono-moneda**
- Existe una caja del banco por divisa: `BANK_CASH_EUR`, `BANK_CASH_USD`, …
- `BankCashAccountResolver` resuelve o crea la caja al primer uso
- Transferencias cross-currency **no** se soportan aquí (futuro FX service)
- Operación con moneda distinta a la de la cuenta → `CurrencyMismatchException`

## Idempotencia

- Header obligatorio: `Idempotency-Key`
- Si la clave ya existe → **HTTP 200** con el resultado original (no 409)
- Constraint UNIQUE en `journal_entries.idempotency_key`

## Transactional outbox

```
[Use case TX]
  1. Validar + aplicar saldos
  2. Insert journal_entries + ledger_entries
  3. Insert outbox_events (envelope completo)
  ── commit ──
[OutboxPublisherWorker]
  SELECT … FOR UPDATE SKIP LOCKED
  send síncrono a Redpanda
  marcar PUBLISHED / retry / FAILED
```

Topic: `banking.ledger.events`

Envelope (estándar del catálogo). El dominio sigue usando `BigDecimal` escala 4
internamente (regla nº2 AGENTS.md), pero en el wire `amount` siempre se serializa
como entero en centavos (`Money.toCents()`), igual que el resto de servicios:

```json
{
  "eventId": "01J…",
  "eventType": "LedgerTransactionPosted",
  "eventVersion": 1,
  "occurredAt": "2026-07-28T12:00:00Z",
  "producer": "ledger-service",
  "correlationId": "01J…",
  "causationId": "01J…",
  "subjectId": "account-id",
  "data": {
    "entryId": "…",
    "paymentId": "pay_… | null",
    "sourceAccountId": "…",
    "targetAccountId": "…",
    "amount": 10000,
    "currency": "EUR",
    "entryType": "DEPOSIT",
    "entries": [ { "accountId": "…", "type": "DEBIT", "amount": 10000, "currency": "EUR" } ],
    "postedAt": "2026-07-28T12:00:00Z"
  }
}
```

`paymentId` viene poblado solo cuando la posición se originó en `POST /transfer` con el
campo opcional `paymentId` (pasado por payment-service); en depósitos/retiros directos
queda `null`.

Eventos emitidos hoy:

| Evento | Cuándo |
|--------|--------|
| `LedgerTransactionPosted` | deposit / withdraw / transfer |
| `LedgerTransactionReversed` | reverse |
| `AccountBalanceChanged` | una por cada cuenta afectada, junto a cada posted/reversed |
| `LedgerTransactionRejected` | validación fallida (fondos insuficientes, moneda, cuenta no encontrada) en deposit/withdraw/transfer/reverse — se registra en su propia transacción (`RejectionRecorder`, `REQUIRES_NEW`) para que sobreviva al rollback del intento fallido |

**`FundsHeld`/`FundsReleased` no se implementan**: son diseño de fase 0 (catálogo
aspiracional) que asumía un flujo de hold/capture. El saga ratificado en ADR-006 postea
directamente (`RISK_REVIEW → AUTHORIZED → POSTING → COMPLETED`, sin paso de hold), así
que construir estos dos eventos hoy sería código sin caller real. Si el saga evoluciona
a un flujo de autorización con hold, `LedgerAccount.hold()`/`.release()` ya existen en
el dominio (`domain/model/LedgerAccount.java`) — solo faltarían el use-case, los
endpoints y las entradas de outbox correspondientes.

## Eventos consumidos

| Evento | Consumidor | Efecto |
|--------|-----------|--------|
| `AccountOpened` (`banking.account.events`) | `AccountOpenedConsumer` | Crea automáticamente la cuenta contable (LIABILITY) para la cuenta recién abierta — reemplaza el paso manual `POST /accounts` cuando la cuenta viene de account-service. Idempotente vía `processed_events`. |

## Modelo de datos (Flyway)

| Tabla | Rol |
|-------|-----|
| `ledger_accounts` | Chart of accounts + saldos + `version` |
| `journal_entries` | Cabecera del asiento + idempotency_key |
| `ledger_entries` | Líneas DEBIT/CREDIT |
| `outbox_events` | Eventos pendientes de publicar |
| `processed_events` | Idempotencia de consumidores (reservada) |

Migraciones:

- `V1__create_ledger_tables.sql`
- `V2__seed_bank_cash_account.sql` (EUR)
- `V3__seed_multi_currency_bank_cash.sql` (resto de monedas)

## Ejemplos

### Depósito USD

```bash
curl -X POST http://localhost:3004/api/ledger/deposit \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: dep-usd-001" \
  -d '{
    "accountId": "USD-CUST-001",
    "amount": 500.00,
    "currency": "USD",
    "description": "Initial deposit"
  }'
```

### Transferencia misma moneda

```bash
curl -X POST http://localhost:3004/api/ledger/transfer \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: trf-001" \
  -d '{
    "sourceAccountId": "ACC-A",
    "targetAccountId": "ACC-B",
    "amount": 100.00,
    "currency": "EUR",
    "description": "P2P"
  }'
```

### Reversión

```bash
curl -X POST http://localhost:3004/api/ledger/reverse \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: rev-001" \
  -d '{
    "originalEntryId": "01J…",
    "reason": "Customer dispute"
  }'
```

## Comandos

```bash
# Docker (recomendado en Windows)
docker compose -f compose.yaml build ledger-service
docker compose -f compose.yaml up -d ledger-service

# Local (requiere Java 21 + Maven)
cd apps/ledger-service
mvn spring-boot:run

# Tests unitarios
mvn test
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3004` | Puerto HTTP |
| `DATABASE_HOST` | `localhost` | Host PostgreSQL |
| `DATABASE_PORT` | `5432` | Puerto PG |
| `DATABASE_NAME` | `ledger_db` | Base de datos |
| `DATABASE_USERNAME` | `postgres` | Usuario |
| `DATABASE_PASSWORD` | `postgres` | Password |
| `REDPANDA_BROKERS` | `localhost:19092` | Bootstrap Kafka |
| `LEDGER_EVENTS_TOPIC` | `banking.ledger.events` | Topic de eventos |

En Compose se usan también `SPRING_DATASOURCE_*` / `SPRING_KAFKA_BOOTSTRAP_SERVERS` (relaxed binding).

## Errores HTTP

| Código | Casos |
|--------|-------|
| 400 | Validación, moneda no soportada, currency mismatch, transfer inválida |
| 404 | Cuenta o journal entry no encontrada |
| 409 | Fondos insuficientes, ya revertido, optimistic lock |
| 500 | Error interno (sin filtrar detalles) |

## Reglas de negocio (checklist AGENTS.md)

- [x] Partida doble
- [x] Money sin float
- [x] Asientos inmutables + reversión
- [x] Idempotency-Key
- [x] Transactional outbox
- [x] BD propia (`ledger_db`)
- [x] Solo ledger toca saldos
- [x] Envelope estándar en eventos
- [x] Hexagonal
- [ ] Auth servicio-a-servicio (fase gateway)
- [x] `AccountBalanceChanged` / `LedgerTransactionRejected` emitidos
- [x] Consume `AccountOpened` (crea cuenta contable automáticamente)
- [N/A] Holds (`FundsHeld`/`FundsReleased`) — diseño de fase 0 no aplicable al saga actual (ADR-006 postea directo, sin hold)
- [ ] Tests de integración / cobertura 80%+

## Notas

- El saldo de clientes es LIABILITY: un depósito **aumenta** el pasivo del banco hacia el cliente.
- `transactionId` es ULID de la operación de negocio (no el accountId).
- Dockerfile multi-stage, usuario no-root `app`, healthcheck en `/api/health`.
