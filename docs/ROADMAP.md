# Roadmap de continuación — desde fase 7

Este documento continúa el roadmap de 11 fases definido en `AGENTS.md`. Fases 0–6 están
completas (auth → customer → account → ledger → payment).

**Actualización 2026-07-31**: 7.0, 7.1 y 7.4 (más el fix de persistencia de fase 9) se
completaron en un pase de deuda técnica previo a seguir con el resto de fase 7 — ver
`docs/KNOWLEDGE_BASE.md` para el detalle de qué cambió en cada servicio. **7.2
(notification-service), 7.3 (query-service) y 7.5 (api-gateway) también hechos**
(mismo día, piezas siguientes del plan "una a la vez"). **Fase 7 completa.**

Convención de checklist: `[ ]` pendiente, `[x]` hecho, cada fase indica su "resultado
verificable" (cómo saber que está realmente hecha, no solo que existe código).

---

## Fase 7 — Risk, Notification, Query

### 7.0 Prerrequisito: cablear el saga a eventos de riesgo reales — HECHO

- [x] `stepRiskReview` publica `PaymentRiskEvaluationRequested` de verdad (topic
  `banking.payment.risk-requests`) y el saga se detiene en `RISK_REVIEW`.
- [x] `RiskEventConsumer` en `payment-service` consume `banking.risk.events`
  (`PaymentApprovedByRisk`/`PaymentRejectedByRisk`), idempotente vía `processed_events`.
- [x] Publicación vía outbox, misma transacción que la transición de estado.
- **Verificado**: `test/saga-orchestrator.spec.ts` cubre `run()` deteniéndose en
  RISK_REVIEW, `resumeAfterRiskApproval()` avanzando a COMPLETED, y
  `handleRiskRejection()` yendo a FAILED — 21/21 tests de payment-service en verde.

### 7.1 risk-service (Python/FastAPI) — HECHO (mínimo real)

- [x] Scaffold hexagonal completo (`domain/`, `application/`, `infrastructure/`,
  `presentation/`), outbox propio (SQLAlchemy + `SELECT ... FOR UPDATE SKIP LOCKED`),
  `processed_events` para idempotencia del consumidor.
- [x] Consume `PaymentRiskEvaluationRequested` (confluent-kafka).
- [x] Reglas deterministas: límite fijo por transacción + límite diario acumulado por
  cuenta origen (solo sobre transacciones aprobadas). **Lista de bloqueo y velocidad de
  transacciones NO implementadas** — quedaron fuera del "mínimo viable" acordado;
  agregar si se necesitan reglas más finas.
- [x] Publica `PaymentApprovedByRisk`/`PaymentRejectedByRisk` vía outbox.
- [x] BD propia `risk_db`, migraciones Alembic (`alembic/versions/0001_create_risk_tables.py`).
- **Verificado**: 10/10 tests (reglas de riesgo, outbox worker, handler con idempotencia,
  todos con SQLite en memoria/mocks — no requieren Postgres/Kafka corriendo). Ver
  `apps/risk-service/README.md` para cómo correrlo.

### 7.2 notification-service (NestJS) — HECHO

- [x] Hexagonal estándar. Consume `PaymentCompleted`, `PaymentRejected`,
  `AccountOpened`, `CustomerSuspended` (tres consumidores explícitos, uno por topic:
  `banking.payment.events`, `banking.account.events`, `banking.customer.events`) —
  la lista exacta de `docs/architecture/bounded-contexts.md` sección 8, no la lista
  aproximada que tenía este roadmap.
- [x] Un solo canal (`LOG`, simula el envío) — sin motor de plantillas
  (`Template`/`Preference`), sin SMTP/Mailhog todavía. Se agrega un canal real cuando
  haga falta, no antes.
- [x] Idempotencia: `processed_events` por consumidor; eventTypes que no generan
  notificación (`PaymentCreated`, `AccountFrozen`, `CustomerRegistered`, etc.) se
  ignoran sin registrar processed_events (evita hinchar la tabla).
- [x] Endpoint de solo lectura `GET /api/notifications/:subjectId` para verificar qué
  se notificó, sin tocar la BD a mano.
- **Verificado**: 8/8 tests (mapeo de eventos a mensaje para los 4 tipos + tipos
  desconocidos → null, caso de uso crea+envía+persiste en orden, round-trip del
  mapper de persistencia). Ver `docs/architecture/notification-service.md`.

### 7.3 query-service (CQRS, proyecciones de lectura) — HECHO

- [x] Cuatro proyecciones (`AccountView`, `TransactionView`, `PaymentView`,
  `CustomerDashboard`) en `query_db`, alimentadas por 4 consumidores explícitos (uno
  por topic: `banking.customer.events`, `banking.account.events`,
  `banking.ledger.events`, `banking.payment.events`).
- [x] `TransactionView` genera una fila por cuenta participante del asiento (historial
  tipo extracto real); `LedgerTransactionReversed` inserta filas nuevas y marca las
  originales `REVERSED`. `PaymentView` hace upsert por `paymentId` sobre los 6 tipos
  de evento de pago (ampliado deliberadamente más allá de los 4 que menciona
  `bounded-contexts.md`, ya que comparten el mismo shape completo).
- [x] Endpoints de solo lectura: `GET /api/accounts/:id`,
  `GET /api/accounts/:id/transactions`, `GET /api/payments/:id`,
  `GET /api/customers/:id/dashboard` — nunca escriben de vuelta a los servicios origen.
- [x] Idempotencia en el consumo (`processed_events`, mismo criterio que
  notification-service). Sin outbox propio: es un consumidor terminal.
- **Verificado**: 22/22 tests (los 6 use-cases de escritura, incluidos casos borde
  como AccountOpened antes que CustomerRegistered e idempotencia de reversas; los 3
  use-cases de lectura), `tsc --noEmit` limpio. Ver
  `docs/architecture/query-service.md`.

### 7.4 Outbox real en servicios NestJS existentes — HECHO

- [x] `outbox_events` + `OutboxPublisherWorker` (`@Interval`, `SELECT ... FOR UPDATE
  SKIP LOCKED`, batch 100, maxRetries 10) en customer-service, account-service y
  payment-service — mismo patrón que ledger-service, replicado por servicio (no una
  librería compartida, por la regla nº13 de `AGENTS.md`).
- [x] Como extra, se cableó también la coreografía que dependía de esto: account-service
  consume `CustomerRegistered`/`CustomerVerified` (gating KYC), ledger-service consume
  `AccountOpened` (auto-creación de cuenta contable) y emite `AccountBalanceChanged`/
  `LedgerTransactionRejected`.
- **Verificado**: tests unitarios por servicio (worker: marca PUBLISHED/FAILED/retry;
  use-cases: insertan en outbox dentro de la misma transacción en vez de publicar
  directo) — 12/12 customer-service, 14/14 account-service, 21/21 payment-service.

### 7.5 api-gateway — HECHO

- [x] NestJS como borde único: verifica JWT RS256 (firma/issuer/audience/exp) con
  la clave pública de auth-service, stateless (sin `auth_db`, sin llamar a
  auth-service en cada request — ADR-005). Fail-closed: si la clave pública no
  resuelve al arrancar, el proceso no levanta.
- [x] Rate limiting básico (`express-rate-limit`, por IP, configurable). Nivel
  "básico" a propósito — endurecer queda para fase 9.
- [x] Enruta por prefijo a auth/customer/account (fuera de Docker, vía
  `host.docker.internal`), ledger/payment/notification/query (red interna
  Docker). `risk-service` no se expone (sin API HTTP pública). Proxy reverso vía
  `http-proxy-middleware` en vez de controllers Nest hechos a mano.
- [x] Colisión de rutas resuelta: `/api/query/*` como namespace propio para las
  proyecciones CQRS de query-service, ya que `GET /api/accounts/:id` y
  `GET /api/payments/:id` ya existen en account-service/payment-service con
  semántica distinta (estado autoritativo inmediato vs. proyección eventualmente
  consistente).
- **Verificado**: 26/26 tests (verificación RS256 con par de claves de prueba —
  firma incorrecta/expirado/issuer/audience incorrectos rechazados; middleware de
  auth con rutas públicas vs protegidas; tabla de rutas públicas), `tsc --noEmit`
  y `nest build` limpios. Ver `docs/architecture/api-gateway.md`.

---

## Fase 8 — Observabilidad de negocio (OpenTelemetry end-to-end)

Prerrequisito de infraestructura ya existe (Prometheus/Grafana/Loki/Tempo/OTel Collector
desplegados desde fase 1), pero **ningún servicio está instrumentado todavía**.

- [ ] Instrumentar cada servicio (TS: `@opentelemetry/sdk-node` + auto-instrumentations;
  Java: agente OTel; Python: `opentelemetry-instrumentation-fastapi`).
- [ ] Propagar `correlationId`/`causationId` del envelope de eventos como trace context,
  no solo como campo de datos — así una traza cruza HTTP + Kafka + servicios.
- [ ] Métricas de negocio: saldo contable total = 0 (invariante de partida doble),
  lag de consumidores por topic, tasa de rechazo de risk-service, pagos por estado.
- [ ] Dashboard Grafana con esas métricas + trazas de un flujo de transferencia completo.
- **Resultado verificable**: una transferencia de prueba es visible como una traza única
  en Tempo que atraviesa payment → risk → ledger → notification, y el dashboard muestra
  saldo contable = 0 en todo momento.

## Fase 9 — Hardening

Incluye STRIDE, rate limiting, escaneo de imágenes, cifrado en reposo, backups —
y absorbe la deuda técnica no resuelta antes (si no se hizo en 7.4/7.5):

- [ ] Revisitar `docs/threat-model/stride-transfer-flow.md` contra el código real
  (fue escrito en fase 0, antes de que existiera payment/risk).
- [x] ~~Corregir `payment-service`: quitar `synchronize: true`~~ — HECHO (ver
  `docs/KNOWLEDGE_BASE.md` §3.4). Adelantado desde fase 9 durante el pase de deuda técnica.
- [ ] Tests de integración/E2E reales: poblar `tests/end-to-end/` con al menos el
  flujo completo auth → customer → account → payment → ledger → risk. Poblar
  `tests/contract/` validando eventos contra los JSON Schema de `contracts/`.
  **Nota (2026-08-01)**: ya se corrió manualmente el flujo completo a través de
  api-gateway (script puntual, no comiteado al repo) y encontró/corrigió 6 bugs
  reales de wiring/migraciones/contrato HTTP — ver `CLAUDE.md` sección
  "Verificación e2e real". Sigue pendiente automatizarlo como test repetible.
- [ ] Implementar `make test` y `make seed` de verdad (hoy son TODOs vacíos) —
  requiere antes un runner agregado de monorepo (workspaces + script raíz).
- [ ] mTLS o token interno de servicio-a-servicio (hoy sin autenticación entre servicios).
- [ ] Rate limiting real en api-gateway (si no se hizo en 7.5).
- [ ] Escaneo de imágenes (Trivy o similar), cifrado en reposo de Postgres, backups
  con prueba de restauración real (no solo `pg_dump` sin verificar).
- **Resultado verificable**: pruebas de abuso definidas en el threat model no
  comprometen el sistema, y una restauración de backup completa se ejecuta y se
  verifica contra datos conocidos.

## Fase 10 — Kubernetes local (K3s) + CI/CD

- [ ] Manifiestos K3s por servicio (Deployment, Service, ConfigMap/Secret, probes
  `/health`/`/ready` ya expuestos desde fase 2+).
- [ ] NetworkPolicies replicando el aislamiento de "una BD por servicio".
- [ ] Rolling updates verificados (no downtime en despliegue de una nueva versión).
- [ ] Gitea + Woodpecker CI autocontenidos (según `AGENTS.md`), pipeline mínimo:
  build multi-stage → test → escaneo de imagen → deploy a K3s local.
- **Resultado verificable**: `k3d cluster delete && k3d cluster create` + un comando
  de despliegue deja el sistema completo funcional de nuevo, sin pasos manuales.

---

## Resumen de secuencia recomendada

```
7.0 saga real de riesgo ────────────────┐ HECHO
7.1 risk-service ────────────────────────┤ HECHO
7.4 outbox en NestJS + coreografía ──────┤ HECHO (incluye fix synchronize:true de fase 9)
7.2 notification-service ────────────────┤ HECHO
7.3 query-service ────────────────────────┤ HECHO
7.5 api-gateway ──────────────────────────┘ HECHO — FASE 7 COMPLETA
→ 8 observabilidad OTel end-to-end
→ 9 hardening (resto: tests E2E, mTLS, STRIDE revisitado, escaneo de imágenes, backups)
→ 10 K3s + CI/CD
```

Fase 7 está completa: los 8 servicios de negocio (auth, customer, account, ledger,
payment, risk, notification, query) más el borde único (api-gateway) son código
real. El siguiente paso natural es fase 8 (observabilidad OTel end-to-end) — ver
`AGENTS.md` para el detalle completo de esa fase.
