# Catálogo de Eventos

## Envelope estándar

Todo evento se publica con este envelope:

```json
{
  "eventId": "01JXYZABC...",
  "eventType": "LedgerTransactionPosted",
  "eventVersion": 1,
  "occurredAt": "2026-07-23T12:00:00Z",
  "producer": "ledger-service",
  "correlationId": "01JABC...",
  "causationId": "01JDEF...",
  "subjectId": "account-123",
  "data": {}
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `eventId` | string (ULID) | Identificador único del evento |
| `eventType` | string | Nombre del evento (PascalCase) |
| `eventVersion` | integer | Versión del schema del evento |
| `occurredAt` | string (ISO 8601) | Timestamp de ocurrencia |
| `producer` | string | Servicio que publicó el evento |
| `correlationId` | string (ULID) | ID que agrupa toda la operación de negocio |
| `causationId` | string (ULID) | ID del evento que causó este |
| `subjectId` | string | ID del recurso principal afectado |
| `data` | object | Payload específico del evento |

---

## Customer Events

### CustomerRegistered
- **Producer**: customer-service
- **Subject**: customerId
- **Payload**:
```json
{
  "customerId": "c_01J...",
  "userId": "u_01J...",
  "email": "cliente@email.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "country": "ES"
}
```

### CustomerVerified
- **Producer**: customer-service
- **Subject**: customerId
- **Payload**:
```json
{
  "customerId": "c_01J...",
  "verifiedAt": "2026-07-23T12:00:00Z",
  "verificationMethod": "DOCUMENT"
}
```

### CustomerSuspended
- **Producer**: customer-service
- **Subject**: customerId
- **Payload**:
```json
{
  "customerId": "c_01J...",
  "reason": "FRAUD_INVESTIGATION",
  "suspendedAt": "2026-07-23T12:00:00Z"
}
```

### CustomerContactUpdated
- **Producer**: customer-service
- **Subject**: customerId
- **Payload**:
```json
{
  "customerId": "c_01J...",
  "changedFields": ["email", "phoneNumber"],
  "updatedAt": "2026-07-23T12:00:00Z"
}
```

---

## Account Events

### AccountOpened
- **Producer**: account-service
- **Subject**: accountId
- **Payload**:
```json
{
  "accountId": "a_01J...",
  "customerId": "c_01J...",
  "accountNumber": "ES0000000001",
  "accountType": "CHECKING",
  "currency": "EUR",
  "openedAt": "2026-07-23T12:00:00Z"
}
```

### AccountFrozen
- **Producer**: account-service
- **Subject**: accountId
- **Payload**:
```json
{
  "accountId": "a_01J...",
  "reason": "SUSPICIOUS_ACTIVITY",
  "frozenAt": "2026-07-23T12:00:00Z",
  "frozenBy": "risk-service"
}
```

### AccountClosed
- **Producer**: account-service
- **Subject**: accountId
- **Payload**:
```json
{
  "accountId": "a_01J...",
  "closedAt": "2026-07-23T12:00:00Z",
  "reason": "CUSTOMER_REQUEST"
}
```

---

## Ledger Events

> **`FundsHeld`/`FundsReleased` — diferidos, no implementados.** Son diseño de fase 0
> que asumía un flujo de hold/capture. El saga de payment-service ratificado en
> ADR-006 postea directamente (`RISK_REVIEW → AUTHORIZED → POSTING → COMPLETED`, sin
> paso de hold), así que estos dos eventos no tienen productor ni consumidor real hoy.
> Se documentan por completitud del diseño original; ver
> `docs/architecture/ledger-service.md` para el detalle de la decisión.

### FundsHeld (diferido — ver nota arriba)
- **Producer**: ledger-service
- **Subject**: accountId
- **Payload**:
```json
{
  "accountId": "a_01J...",
  "holdId": "h_01J...",
  "amount": 10000,
  "currency": "EUR",
  "paymentId": "p_01J...",
  "heldAt": "2026-07-23T12:00:00Z"
}
```

### FundsReleased (diferido — ver nota arriba)
- **Producer**: ledger-service
- **Subject**: accountId
- **Payload**:
```json
{
  "accountId": "a_01J...",
  "holdId": "h_01J...",
  "amount": 10000,
  "currency": "EUR",
  "paymentId": "p_01J...",
  "releasedAt": "2026-07-23T12:00:00Z"
}
```

### LedgerTransactionPosted
- **Producer**: ledger-service
- **Subject**: entryId
- **Payload**:
```json
{
  "entryId": "e_01J...",
  "paymentId": "p_01J...",
  "sourceAccountId": "a_01J...",
  "targetAccountId": "a_02J...",
  "amount": 10000,
  "currency": "EUR",
  "entryType": "TRANSFER",
  "entries": [
    {"accountId": "a_01J...", "type": "DEBIT", "amount": 10000, "currency": "EUR"},
    {"accountId": "a_02J...", "type": "CREDIT", "amount": 10000, "currency": "EUR"}
  ],
  "postedAt": "2026-07-23T12:00:00Z"
}
```

### LedgerTransactionRejected
- **Producer**: ledger-service
- **Subject**: paymentId
- **Payload**:
```json
{
  "paymentId": "p_01J...",
  "reason": "INSUFFICIENT_FUNDS",
  "sourceAccountId": "a_01J...",
  "targetAccountId": "a_02J...",
  "amount": 10000,
  "currency": "EUR",
  "rejectedAt": "2026-07-23T12:00:00Z"
}
```

### LedgerTransactionReversed
- **Producer**: ledger-service
- **Subject**: entryId (original)
- **Payload**:
```json
{
  "originalEntryId": "e_01J...",
  "reversalEntryId": "e_02J...",
  "paymentId": "p_01J...",
  "reason": "PAYMENT_FAILED",
  "amount": 10000,
  "currency": "EUR",
  "reversedAt": "2026-07-23T12:00:00Z"
}
```

### AccountBalanceChanged
- **Producer**: ledger-service
- **Subject**: accountId
- **Payload**:
```json
{
  "accountId": "a_01J...",
  "previousBalance": 50000,
  "newBalance": 40000,
  "delta": -10000,
  "currency": "EUR",
  "entryId": "e_01J...",
  "changedAt": "2026-07-23T12:00:00Z"
}
```

---

## Payment Events

### PaymentCreated
- **Producer**: payment-service
- **Subject**: paymentId
- **Payload**:
```json
{
  "paymentId": "p_01J...",
  "idempotencyKey": "ik_01J...",
  "sourceAccountId": "a_01J...",
  "targetAccountId": "a_02J...",
  "amount": 10000,
  "currency": "EUR",
  "description": "Pago alquiler",
  "initiatedBy": "c_01J...",
  "createdAt": "2026-07-23T12:00:00Z"
}
```

### PaymentRiskEvaluationRequested
- **Producer**: payment-service
- **Subject**: paymentId
- **Payload**:
```json
{
  "paymentId": "p_01J...",
  "sourceCustomerId": "c_01J...",
  "targetCustomerId": "c_02J...",
  "sourceAccountId": "a_01J...",
  "targetAccountId": "a_02J...",
  "amount": 10000,
  "currency": "EUR",
  "requestedAt": "2026-07-23T12:00:00Z"
}
```

### PaymentAuthorized
- **Producer**: payment-service
- **Subject**: paymentId
- **Payload**:
```json
{
  "paymentId": "p_01J...",
  "authorizedAt": "2026-07-23T12:00:00Z"
}
```

### PaymentRejected
- **Producer**: payment-service
- **Subject**: paymentId
- **Payload**:
```json
{
  "paymentId": "p_01J...",
  "reason": "RISK_REJECTED",
  "rejectedAt": "2026-07-23T12:00:00Z"
}
```

### PaymentCompleted
- **Producer**: payment-service
- **Subject**: paymentId
- **Payload**:
```json
{
  "paymentId": "p_01J...",
  "sourceAccountId": "a_01J...",
  "targetAccountId": "a_02J...",
  "amount": 10000,
  "currency": "EUR",
  "entryId": "e_01J...",
  "completedAt": "2026-07-23T12:00:01Z"
}
```

### PaymentFailed
- **Producer**: payment-service
- **Subject**: paymentId
- **Payload**:
```json
{
  "paymentId": "p_01J...",
  "reason": "LEDGER_UNAVAILABLE",
  "failedAt": "2026-07-23T12:00:01Z"
}
```

### PaymentReversalRequested
- **Producer**: payment-service
- **Subject**: paymentId
- **Payload**:
```json
{
  "paymentId": "p_01J...",
  "entryId": "e_01J...",
  "reason": "MANUAL_REVERSAL",
  "requestedAt": "2026-07-23T12:05:00Z"
}
```

### PaymentReversed
- **Producer**: payment-service
- **Subject**: paymentId
- **Payload**:
```json
{
  "paymentId": "p_01J...",
  "reversalEntryId": "e_02J...",
  "reversedAt": "2026-07-23T12:05:01Z"
}
```

---

## Risk Events

### PaymentApprovedByRisk
- **Producer**: risk-service
- **Subject**: paymentId
- **Payload**:
```json
{
  "paymentId": "p_01J...",
  "evaluationId": "re_01J...",
  "riskScore": 15,
  "approvedAt": "2026-07-23T12:00:00Z"
}
```

### PaymentRejectedByRisk
- **Producer**: risk-service
- **Subject**: paymentId
- **Payload**:
```json
{
  "paymentId": "p_01J...",
  "evaluationId": "re_01J...",
  "riskScore": 85,
  "flags": ["HIGH_AMOUNT", "NEW_RECIPIENT"],
  "rejectedAt": "2026-07-23T12:00:00Z"
}
```

### PaymentFlaggedForReview
- **Producer**: risk-service
- **Subject**: paymentId
- **Payload**:
```json
{
  "paymentId": "p_01J...",
  "evaluationId": "re_01J...",
  "riskScore": 55,
  "flags": ["VELOCITY"],
  "flaggedAt": "2026-07-23T12:00:00Z"
}
```

---

## Canales Redpanda (Topics)

| Topic | Eventos | Particiones |
|-------|---------|-------------|
| `banking.customer.events` | CustomerRegistered, CustomerVerified, CustomerSuspended, CustomerContactUpdated | 3 |
| `banking.account.events` | AccountOpened, AccountFrozen, AccountClosed | 3 |
| `banking.ledger.events` | FundsHeld, FundsReleased, LedgerTransactionPosted, LedgerTransactionRejected, LedgerTransactionReversed, AccountBalanceChanged | 6 |
| `banking.payment.events` | PaymentCreated, PaymentAuthorized, PaymentRejected, PaymentCompleted, PaymentFailed, PaymentReversalRequested, PaymentReversed | 6 |
| `banking.risk.events` | PaymentApprovedByRisk, PaymentRejectedByRisk, PaymentFlaggedForReview | 3 |
| `banking.payment.risk-requests` | PaymentRiskEvaluationRequested | 3 |
| `banking.payment.reversal-requests` | PaymentReversalRequested | 3 |

---

## Flujo completo de transferencia (happy path)

```
1. API Gateway → payment-service: POST /payments/transfer
2. payment-service escribe Payment en BD + PaymentCreated en outbox
3. payment-service outbox → banking.payment.events: PaymentCreated
4. payment-service → banking.payment.risk-requests: PaymentRiskEvaluationRequested
5. risk-service consume → evalúa reglas → banking.risk.events: PaymentApprovedByRisk
6. payment-service consume PaymentApprovedByRisk → actualiza estado a AUTHORIZED
7. payment-service emite PaymentAuthorized a banking.payment.events
8. payment-service → ledger-service: POST /ledger/post (síncrono con Idempotency-Key)
9. ledger-service valida, crea JournalEntry + OutboxEvent en misma TX
10. ledger-service outbox → banking.ledger.events: LedgerTransactionPosted + AccountBalanceChanged
11. payment-service consume LedgerTransactionPosted → actualiza a COMPLETED
12. payment-service → banking.payment.events: PaymentCompleted
13. query-service consume todos los eventos → actualiza proyecciones
14. notification-service consume PaymentCompleted → envía notificación
```

### Flujo de compensación (reversión)

```
1. payment-service → banking.payment.events: PaymentReversalRequested
2. ledger-service consume → crea Entry reversal (débito/crédito invertidos)
3. ledger-service → banking.ledger.events: LedgerTransactionReversed + AccountBalanceChanged
4. payment-service consume LedgerTransactionReversed → actualiza a REVERSED
5. payment-service → banking.payment.events: PaymentReversed
```
