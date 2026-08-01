# Bounded Contexts — Core Bancario

## Mapa de Contextos

```
┌──────────────────────────────────────────────────────────┐
│                    Auth Context                          │
│  Registro, login, JWT, roles, refresh tokens             │
└──────────────────────────────────────────────────────────┘
         │ identity link (userId)
         ▼
┌──────────────────────────────────────────────────────────┐
│                  Customer Context                        │
│  Perfil, KYC, dirección, contacto, estado, vinculación   │
└──────────────────────────────────────────────────────────┘
         │ customerId
         ▼
┌──────────────────────────────────────────────────────────┐
│                  Account Context                         │
│  Apertura de cuentas, tipos, límites, estado de cuenta   │
└──────────────────────────────────────────────────────────┘
         │ accountId
         ▼
┌──────────────────────────────────────────────────────────┐
│                   Ledger Context                         │
│  Partida doble, asientos, saldos, outbox, inmutabilidad  │
└──────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Payment Context │  │  Risk Context   │  │  Query Context  │
│ Saga, estados   │  │ Reglas, límites │  │ Proyecciones    │
│ compensación    │  │ scoring, flags  │  │ CQRS, extractos │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│              Notification Context                        │
│  Plantillas, envío, preferencias, idempotencia           │
└──────────────────────────────────────────────────────────┘
```

---

## 1. Auth Context

**Servicio**: `auth-service`

### Agregados

| Agregado | Descripción |
|----------|-------------|
| **User** | Entidad raíz. Identidad digital del usuario. userId, email, passwordHash (Argon2id), status (ACTIVE/SUSPENDED/LOCKED) |

### Entidades y Value Objects

| Elemento | Tipo | Descripción |
|----------|------|-------------|
| `Email` | Value Object | Email validado, único |
| `Password` | Value Object | Hash Argon2id con salt único por usuario |
| `Role` | Value Object | customer, support, auditor, risk-analyst, administrator, service-account |
| `RefreshToken` | Entity | Token de refresco con rotación, vinculado a User |
| `Session` | Entity | Sesión activa, device info, IP, expiración |

### Responsabilidades
- Registro de usuarios
- Login con JWT RS256 (access token corto + refresh token)
- Rotación de refresh tokens
- Gestión de roles y scopes
- Revocación de sesiones
- Rate limiting de intentos de login

### Scopes
```
auth:login
auth:register
auth:refresh
auth:revoke
auth:admin (manage users, roles)
```

---

## 2. Customer Context

**Servicio**: `customer-service`

### Agregados

| Agregado | Descripción |
|----------|-------------|
| **Customer** | Entidad raíz. Relación bancaria del cliente. customerId, userId (FK lógico a Auth), status, riskLevel |

### Entidades y Value Objects

| Elemento | Tipo | Descripción |
|----------|------|-------------|
| `CustomerId` | Value Object | Identificador único del cliente bancario |
| `Address` | Value Object | Dirección postal (street, city, country, postalCode) |
| `PhoneNumber` | Value Object | Número de teléfono validado |
| `KYCInfo` | Entity | Estado KYC (PENDING, VERIFIED, REJECTED), documentos, fecha |
| `Consent` | Entity | Preferencias y consentimientos del cliente |

### Eventos publicados
- `CustomerRegistered`
- `CustomerVerified`
- `CustomerSuspended`
- `CustomerContactUpdated`

### Eventos consumidos
- Ninguno (se vincula vía userId de Auth)

---

## 3. Account Context

**Servicio**: `account-service`

### Agregados

| Agregado | Descripción |
|----------|-------------|
| **Account** | Entidad raíz. Cuenta bancaria. accountId, customerId, accountNumber, type, currency, status |

### Entidades y Value Objects

| Elemento | Tipo | Descripción |
|----------|------|-------------|
| `AccountId` | Value Object | Identificador único de cuenta |
| `AccountNumber` | Value Object | Número de cuenta visible al cliente |
| `AccountType` | Enum | CHECKING, SAVINGS |
| `Currency` | Value Object | Código ISO 4217 (EUR, USD) |
| `Money` | Value Object | Monto + moneda (int64 para centavos) |
| `AccountStatus` | Enum | PENDING, ACTIVE, FROZEN, CLOSED |
| `AccountLimit` | Entity | Límites diarios, por transacción, mínimos |

### Eventos publicados
- `AccountOpened`
- `AccountFrozen`
- `AccountClosed`

### Eventos consumidos
- `CustomerRegistered` (solo clientes VERIFIED pueden abrir cuenta)

---

## 4. Ledger Context

**Servicio**: `ledger-service` — **El más crítico**

### Agregados

| Agregado | Descripción |
|----------|-------------|
| **LedgerAccount** | Entidad raíz contable. ledgerAccountId, accountId, type (ASSET/LIABILITY/EQUITY/INCOME/EXPENSE), balance |
| **JournalEntry** | Entidad raíz. Transacción contable inmutable. entryId, type, status, entries[], timestamp |
| **LedgerEntry** | Entity. Cada línea de débito o crédito dentro de un JournalEntry |

### Entidades y Value Objects

| Elemento | Tipo | Descripción |
|----------|------|-------------|
| `EntryId` | Value Object | Identificador único de asiento |
| `DebitCredit` | Enum | DEBIT, CREDIT |
| `Money` | Value Object | Monto + moneda, siempre int64 (centavos) |
| `EntryType` | Enum | DEPOSIT, WITHDRAWAL, TRANSFER, REVERSAL, FEE |
| `EntryStatus` | Enum | POSTED, REVERSED |
| `OutboxEvent` | Entity | Evento pendiente de publicación (outbox pattern) |
| `InboxEvent` | Entity | Evento recibido ya procesado (idempotencia) |

### Reglas de negocio
1. Σ débitos = Σ créditos en todo JournalEntry
2. Dinero en enteros (centavos) + moneda. Nunca float/double
3. JournalEntry POSTED es inmutable. Errores se corrigen con REVERSAL
4. Idempotencia obligatoria: `Idempotency-Key` en comandos, `event_id` en consumidores
5. Transactional Outbox: evento guardado en misma transacción que el asiento
6. Optimistic locking (version) en LedgerAccount para concurrencia
7. Solo ledger-service toca saldos
8. Guardar siempre moneda junto al monto

### Eventos publicados
- `AccountOpened` (eco contable)
- `FundsHeld`
- `FundsReleased`
- `LedgerTransactionPosted`
- `LedgerTransactionRejected`
- `LedgerTransactionReversed`
- `AccountBalanceChanged`

### Eventos consumidos
- `AccountOpened` (crear estructura contable)
- `PaymentAuthorized` (ejecutar débito/crédito)
- `PaymentReversalRequested` (revertir asientos)

---

## 5. Payment Context

**Servicio**: `payment-service`

### Agregados

| Agregado | Descripción |
|----------|-------------|
| **Payment** | Entidad raíz. Transferencia entre cuentas. paymentId, sourceAccountId, targetAccountId, amount, currency, status |

### Entidades y Value Objects

| Elemento | Tipo | Descripción |
|----------|------|-------------|
| `PaymentId` | Value Object | Identificador único de pago |
| `Money` | Value Object | Monto + moneda |
| `PaymentStatus` | Enum | CREATED, VALIDATING, RISK_REVIEW, AUTHORIZED, POSTING, COMPLETED, REJECTED, FAILED, REVERSING, REVERSED |
| `IdempotencyKey` | Value Object | Clave de idempotencia del comando original |
| `PaymentStateMachine` | Domain Service | Valida transiciones de estado permitidas |

### Transiciones de estado

```
CREATED → VALIDATING → RISK_REVIEW → AUTHORIZED → POSTING → COMPLETED
                                          │
                                          ▼
                                      REJECTED
                    
CREATED → VALIDATING → FAILED

COMPLETED → REVERSING → REVERSED
```

### Responsabilidades
- Orquestar saga de transferencia
- Validar límites básicos
- Solicitar evaluación de riesgo
- Solicitar contabilización al ledger
- Gestionar compensación en caso de fallo
- Timeouts y reintentos

### Eventos publicados
- `PaymentCreated`
- `PaymentRiskEvaluationRequested`
- `PaymentAuthorized`
- `PaymentRejected`
- `PaymentCompleted`
- `PaymentFailed`
- `PaymentReversalRequested`
- `PaymentReversed`

### Eventos consumidos
- `PaymentApprovedByRisk` / `PaymentRejectedByRisk`
- `LedgerTransactionPosted` / `LedgerTransactionRejected`
- `LedgerTransactionReversed`

---

## 6. Risk Context

**Servicio**: `risk-service`

### Agregados

| Agregado | Descripción |
|----------|-------------|
| **RiskRule** | Entidad raíz. Regla de riesgo configurable. ruleId, name, condition, action, priority |
| **RiskEvaluation** | Entidad. Resultado de evaluar un pago. evaluationId, paymentId, score, flags[], recommendation |

### Entidades y Value Objects

| Elemento | Tipo | Descripción |
|----------|------|-------------|
| `RiskScore` | Value Object | Puntuación de riesgo (0-100) |
| `RiskFlag` | Enum | HIGH_AMOUNT, VELOCITY, NEW_RECIPIENT, BLOCKED_ACCOUNT, SUSPICIOUS_PATTERN |
| `RuleCondition` | Value Object | Condición evaluable (amount > limit, count > threshold, etc.) |
| `DailyLimit` | Entity | Límite por cliente/día con contador |

### Reglas iniciales
- Más de 5 transferencias en 1 minuto → FLAG
- Importe > límite configurable del cliente → FLAG o REJECT
- Destinatario nuevo + importe elevado → FLAG
- Múltiples intentos rechazados consecutivos → BLOCK temporal
- Cuenta congelada → REJECT automático

### Eventos publicados
- `PaymentApprovedByRisk`
- `PaymentRejectedByRisk`
- `PaymentFlaggedForReview`

### Eventos consumidos
- `PaymentRiskEvaluationRequested`

---

## 7. Query Context

**Servicio**: `query-service`

### Agregados (proyecciones de lectura)

| Proyección | Origen | Descripción |
|------------|--------|-------------|
| `AccountView` | AccountOpened, AccountBalanceChanged | Vista de cuenta con saldo actual |
| `TransactionView` | LedgerTransactionPosted, LedgerTransactionReversed | Historial de movimientos |
| `PaymentView` | PaymentCreated, PaymentCompleted, PaymentRejected, PaymentReversed | Estado de pagos |
| `CustomerDashboard` | CustomerRegistered, AccountOpened | Dashboard del cliente |

### Responsabilidades
- Consumir todos los eventos de dominio
- Mantener proyecciones materializadas en PostgreSQL
- Exponer APIs de consulta rápidas (sin joins cross-service)
- Generar extractos
- Búsqueda por correlationId

### Principios
- No es fuente de verdad contable (ledger lo es)
- Muestra timestamp de última actualización cuando hay rezago
- Solo lectura, nunca emite comandos

---

## 8. Notification Context

**Servicio**: `notification-service`

### Agregados

| Agregado | Descripción |
|----------|-------------|
| **Notification** | Entidad. Notificación enviada. notificationId, customerId, channel, templateId, status |

### Entidades

| Elemento | Descripción |
|----------|-------------|
| `Template` | Plantilla de notificación (subject, body, variables) |
| `Preference` | Canal preferido por cliente por tipo de notificación |
| `Channel` | EMAIL, IN_APP, SMS (simulados en MVP) |

### Responsabilidades
- Consumir eventos de dominio
- Resolver plantillas con datos del evento
- Enviar por canal preferido (simulado)
- Registrar envío para evitar duplicados
- Reintentos con backoff

### Eventos consumidos
- `PaymentCompleted`
- `PaymentRejected`
- `AccountOpened`
- `CustomerSuspended`

---

## Relaciones entre Contextos

```
Auth ──(userId)──▶ Customer ──(customerId)──▶ Account ──(accountId)──▶ Ledger
                                                                          │
                                                     Payment ◀───────────┤
                                                        │                │
                                                        ▼                │
                                                       Risk              │
                                                        │                │
                                                        ▼                ▼
                                                    Notification      Query
```

### Líneas de integración

| Origen → Destino | Tipo | Evento / API |
|-------------------|------|-------------|
| Auth → Customer | Lógica (userId) | Vinculación por userId en registro |
| Customer → Account | Evento | `CustomerRegistered` |
| Account → Ledger | Evento | `AccountOpened` |
| Payment → Risk | Evento | `PaymentRiskEvaluationRequested` |
| Risk → Payment | Evento | `PaymentApprovedByRisk` / `PaymentRejectedByRisk` |
| Payment → Ledger | API síncrona | POST /ledger/post (con Idempotency-Key) |
| Ledger → Payment | Evento | `LedgerTransactionPosted` |
| Payment → Query | Evento | `PaymentCompleted` |
| Ledger → Query | Evento | `LedgerTransactionPosted` |
| Payment → Notification | Evento | `PaymentCompleted` |
