# Estado MVP — Fases 0 a 6

Fecha de actualización: 2026-07-29

## Resumen

| Fase | Entregable | Estado | Resultado verificable |
|------|------------|--------|------------------------|
| 0 | Diseño (C4, BC, ADRs, AsyncAPI, STRIDE) | ✅ Hecho | Docs en `docs/` + `contracts/` |
| 1 | Infra Compose (PG, Redpanda, obs) | ✅ Hecho | `docker compose up` sano |
| 2 | auth-service | ✅ Hecho | Login JWT RS256 + Argon2id |
| 3 | customer-service | ✅ Hecho | CRUD + KYC + eventos Redpanda |
| 4 | account-service | ✅ Hecho | Apertura cuenta + `AccountOpened` |
| 5 | ledger-service | ✅ Hecho | Deposit/withdraw/transfer/reverse + outbox |
| 6 | payment-service | ✅ Hecho | Saga orquestada + máquina de estados + eventos |

MVP de flujo contable autenticable: **auth → customer → account → ledger**.  
Falta el orquestador de pagos (fase 6) para el happy path completo de transferencia con saga y risk.

## Documentación por fase

| Fase | Docs principales |
|------|------------------|
| 0 | [`docs/architecture/c4-context.md`](../architecture/c4-context.md), [`c4-containers.md`](../architecture/c4-containers.md), [`bounded-contexts.md`](../architecture/bounded-contexts.md), [`docs/adr/`](../adr/), [`docs/events/catalog.md`](../events/catalog.md), [`docs/threat-model/stride-transfer-flow.md`](../threat-model/stride-transfer-flow.md) |
| 1 | [`docs/architecture/infrastructure.md`](../architecture/infrastructure.md) |
| 2 | [`docs/architecture/auth-service.md`](../architecture/auth-service.md) |
| 3 | [`docs/architecture/customer-service.md`](../architecture/customer-service.md) |
| 4 | [`docs/architecture/account-service.md`](../architecture/account-service.md) |
| 5 | [`docs/architecture/ledger-service.md`](../architecture/ledger-service.md) |
| 6 | [`docs/architecture/payment-service.md`](../architecture/payment-service.md) |
| Transversal | [`docs/architecture/hexagonal-architecture.md`](../architecture/hexagonal-architecture.md), [ADR-007](../adr/007-hexagonal-architecture.md) |

## Puertos de aplicación

| Servicio | Puerto | BD |
|----------|--------|-----|
| auth-service | 3001 | `auth_db` |
| customer-service | 3002 | `customer_db` |
| account-service | 3003 | `account_db` |
| ledger-service | 3004 | `ledger_db` |
| payment-service | 3005 | `payment_db` |

## Topics Redpanda activos

| Topic | Producer |
|-------|----------|
| `banking.customer.events` | customer-service |
| `banking.account.events` | account-service |
| `banking.ledger.events` | ledger-service |
| `banking.payment.events` | payment-service |

## Decisiones clave ya tomadas

| ADR | Decisión |
|-----|----------|
| 001 | Redpanda (no Kafka+ZK) |
| 002 | Monorepo |
| 003 | JSON Schema (MVP) |
| 004 | Outbox worker propio |
| 005 | Auth custom JWT RS256 + Argon2id |
| 006 | Saga orquestada (payment-service) |
| 007 | Hexagonal obligatoria |

## Gaps conocidos antes de fase 6

1. **Ledger**: no emite aún `FundsHeld` / `FundsReleased` / `AccountBalanceChanged` (necesarios para saga robusta).
2. **Auth entre servicios**: ledger y APIs internas sin mTLS/JWT de servicio.
3. **API Gateway**: no hay borde único con rate limiting + validación JWT.
4. **Risk**: no existe; payment-service en fase 6 puede stubear risk o arrancar risk en paralelo.
5. **Tests**: unitarios en ledger; falta cobertura integración/E2E del flujo completo.
6. **account-service monedas**: alineado con ledger (EUR/USD/GBP/LatAm…); documentar límites de negocio por moneda.

## Siguiente fase

**Fase 7 — risk-service + notification-service + query-service**

- risk-service: evaluación de riesgo de pagos (reglas, scoring)
- notification-service: notificaciones por email/SMS/push
- query-service: proyecciones CQRS para consultas de lectura
