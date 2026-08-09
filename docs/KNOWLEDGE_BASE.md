# Knowledge Base — Banking Core Event-Driven

Auditoría del estado real del repositorio (código, no aspiración de docs), generada 2026-07-31.
Objetivo: que cualquier agente o persona que retome el proyecto sepa qué es real, qué es
cascarón, y qué contradice la documentación existente, sin tener que releer todo el código.

**Actualización 2026-07-31 (misma fecha, pase de deuda técnica posterior a la auditoría
inicial)**: las brechas §3.1, §3.2 y §3.4 descritas abajo fueron resueltas en un pase
dedicado — outbox real en los 3 servicios NestJS, coreografía de eventos del flujo
crítico (account-service consume CustomerRegistered/CustomerVerified, ledger-service
consume AccountOpened y emite AccountBalanceChanged/LedgerTransactionRejected, saga de
riesgo real con risk-service nuevo), y fix del bug de `synchronize: true`. Cada
subsección abajo indica explícitamente qué quedó resuelto y qué sigue igual (§3.3,
tests, se resolvió parcialmente después, en fase 9 — ver actualización 2026-08-06
más abajo).

**Actualización 2026-08-06 (fase 9, etapas 1-4 de hardening)**: se cerró el bypass
de JWT en account/customer-service (§6), se construyeron `tests/end-to-end/` y
`tests/contract/` (§3.3), y `make seed` dejó de ser un TODO. Detalle completo,
etapa por etapa, en `CLAUDE.md`.

**Actualización 2026-08-01**: se containerizaron auth/customer/account (ya no corren
"a mano") y se corrió el flujo e2e completo por primera vez a través de api-gateway.
Esto encontró y corrigió 7 bugs reales que ningún test unitario con mocks podía
detectar (DI wiring roto en auth-service, migraciones nunca conectadas en
payment-service/risk-service, columnas de outbox subdimensionadas, mismatch de
centavos-vs-decimal entre payment-service y ledger-service, y ledger-service
exponiendo su ID interno de cuenta en vez del externo de account-service en sus
eventos/respuesta REST — este último encontrado al armar `requests/banking.http` y
verificar el endpoint de historial de query-service) — detalle completo en
`CLAUDE.md` sección "Verificación e2e real (2026-08-01)".

## 1. Qué es este proyecto

Core bancario event-driven **personal/educativo**, generado originalmente con OpenCode
(múltiples agentes/modelos, ver `opencode.json`: deepseek-v4-pro como build agent,
kimi-k2.6 para review/plan). Todo corre en contenedores locales, sin cloud ni serverless.
No es un repositorio git (no hay `.git`), pese a que `AGENTS.md` define Conventional Commits
y flujo de PRs — no hay historial ni forma de hacer diff de cambios pasados.

Roadmap de 11 fases (0–10) definido en `AGENTS.md` / `README.md`. **Fases 0–7
completas**: los 8 servicios de negocio más api-gateway (borde único) ya son
código real. Fase 8 (observabilidad OTel end-to-end) es el siguiente paso.

## 2. Inventario real de servicios

| Servicio | Estado | Lenguaje/Stack | Código real |
|---|---|---|---|
| auth-service | ✅ implementado | NestJS, JWT RS256 + Argon2id | Sí, hexagonal completo |
| customer-service | ✅ implementado | NestJS | Sí, hexagonal completo |
| account-service | ✅ implementado | NestJS | Sí, hexagonal completo |
| ledger-service | ✅ implementado | Java 21 / Spring Boot 3.3 / Flyway | Sí, hexagonal + outbox real |
| payment-service | ✅ implementado | NestJS, saga orquestada | Sí, hexagonal completo |
| risk-service | ✅ implementado (mínimo real) | Python/FastAPI, hexagonal, outbox propio | Sí — reglas deterministas (límite por transacción + límite diario), cableado al saga de payment-service |
| notification-service | ✅ implementado (mínimo real) | NestJS, hexagonal, sin outbox (consumidor terminal) | Sí — 3 consumidores idempotentes (payment/account/customer events), canal único `LOG` |
| query-service | ✅ implementado | NestJS, hexagonal, sin outbox (consumidor terminal) | Sí — 4 proyecciones CQRS (AccountView/TransactionView/PaymentView/CustomerDashboard), 4 consumidores idempotentes |
| api-gateway | ✅ implementado | NestJS, hexagonal delgada, sin BD/Kafka | Sí — JWT RS256 stateless fail-closed, rate limiting básico, proxy reverso (`http-proxy-middleware`) a 6 servicios |
| web-app | ❌ vacío | React (planeado) | Carpeta existe, 0 archivos |

También vacíos: `libraries/{ts-event-envelope,java-observability,py-event-envelope}/`,
`tests/resilience/`, `contracts/openapi/`. (`tests/contract/` y `tests/end-to-end/`
ya no están vacíos — ver §3.3, actualizada 2026-08-06.)

Cada servicio con código real sigue la estructura hexagonal obligatoria
(`domain/ → application/ → infrastructure/ → presentation/`) definida en ADR-007 —
verificado directamente en el árbol de archivos, no solo en la documentación.

## 3. Divergencias documentación vs código (lo más importante de esta auditoría)

La documentación de arquitectura (`docs/architecture/*`, `docs/events/catalog.md`,
`docs/phases/00-05-mvp-status.md`) describe el diseño de fase 0, no siempre el código actual.
Verificado línea por línea, no por lectura superficial:

### 3.1 Transactional outbox — ~~solo existe en Java~~ RESUELTO (2026-07-31)

~~Solo `ledger-service` implementa outbox real~~. Ahora `customer-service`,
`account-service` y `payment-service` también implementan el patrón completo: entidad
`OutboxEvent` (dominio), tabla `outbox_events` (migración TypeORM), repositorio +
`TransactionRunner` (transacción compartida entre el guardado del agregado y el insert
del outbox), y `OutboxPublisherWorker` (`@Interval(1000)`, `SELECT ... FOR UPDATE SKIP
LOCKED`, batch 100, maxRetries 10) — mismo diseño que `ledger-service`, replicado por
servicio (no una librería compartida, por la regla nº13 de `AGENTS.md` contra librerías
de dominio compartidas). `KafkaEventPublisher` en cada servicio se redujo a un
`sendRaw(topic, key, payload)` que solo el worker invoca; los use-cases ya no publican
directamente.

### 3.2 Coreografía de eventos — RESUELTO para el flujo crítico (2026-07-31)

Lo que describía esta sección ya no aplica al flujo principal. Estado actual:

- **Ya no es un solo consumidor**: `account-service` consume `CustomerRegistered`/
  `CustomerVerified` (proyección local `customer_projections`, gatea la apertura de
  cuenta en KYC verificado); `ledger-service` consume `AccountOpened` (crea la cuenta
  contable LIABILITY automáticamente); `payment-service` añadió `RiskEventConsumer`
  (`banking.risk.events`) junto al `LedgerEventConsumer` ya existente.
- **ledger-service ahora también emite `AccountBalanceChanged`** (una por cuenta
  afectada, junto a cada posted/reversed) y **`LedgerTransactionRejected`** (registrado
  en transacción separada vía `RejectionRecorder`, `REQUIRES_NEW`, para sobrevivir al
  rollback del intento fallido). `FundsHeld`/`FundsReleased` se dejaron explícitamente
  diferidos (no implementación a medias): son diseño de fase 0 para un flujo hold/capture
  que el saga ratificado en ADR-006 no usa (postea directo) — ver
  `docs/architecture/ledger-service.md`.
- **El paso de riesgo ya no es un stub**: `stepRiskReview` publica
  `PaymentRiskEvaluationRequested` de verdad (topic dedicado
  `banking.payment.risk-requests`) y el saga **se detiene ahí** — ya no llama a
  `stepAuthorize` en el mismo `run()`. Un `risk-service` nuevo (Python/FastAPI, hexagonal,
  outbox propio) lo consume, aplica reglas deterministas (límite por transacción + límite
  diario acumulado por cuenta origen sobre transacciones aprobadas) y publica
  `PaymentApprovedByRisk`/`PaymentRejectedByRisk`. `RiskEventConsumer` en payment-service
  reanuda el saga (`resumeAfterRiskApproval`) o lo falla (`handleRiskRejection`).
- **Payment → Ledger sigue siendo HTTP síncrono** (`LedgerHttpClient`) — decisión
  deliberada, no una brecha: el POST ya hace el trabajo transaccional y devuelve
  éxito/fallo en la respuesta; el evento async `LedgerTransactionPosted` que consume
  `LedgerEventConsumer` es registro de auditoría adicional, no el driver de la
  transición de estado. Ahora sí incluye `paymentId` (antes ausente) para que
  `LedgerTransactionPosted` satisfaga el contrato JSON Schema.
- Los endpoints manuales (`/advance`, `/authorize`, `/posting`, `/complete`, `/fail`)
  se mantienen para depuración, pero el camino normal es 100% dirigido por eventos.

Detalle completo de la implementación: `docs/architecture/payment-service.md` y
`docs/architecture/ledger-service.md`.

### 3.3 Cobertura de tests — muy por debajo de lo exigido

| Servicio | Tests |
|---|---|
| auth-service | **ninguno** (aunque `npm test` raíz y `make test-auth` lo invocan) |
| customer-service | `src/customers.use-cases.spec.ts` (1 archivo) |
| account-service | `src/accounts.use-cases.spec.ts` (1 archivo) |
| ledger-service | 5 tests JUnit, todos de `domain/` (Money, Currency, JournalEntry, LedgerAccount, BankCashAccountResolver) |
| payment-service | `test/payment-state-machine.spec.ts`, `test/saga-orchestrator.spec.ts` (2 archivos) |

**RESUELTO (2026-08-06, fase 9 etapas 2-3)**: `tests/end-to-end/critical-flow.e2e-spec.ts`
corre 8 tests contra el stack real vía api-gateway (register → login → customer → KYC →
2 cuentas → depósito → transferencia con polling de saga → proyecciones de query-service →
notificación), y `tests/contract/` valida eventos reales capturados por ese mismo E2E (más
2 fixtures sintéticas) contra los JSON Schema de `contracts/json-schema/`. `make test` ya
agrega de verdad `test-unit` (los 9 servicios) + `test-e2e` + `test-contract` (target real
en el `Makefile` raíz), y `make seed` deja el stack con datos de demo reproducibles
(verificado idempotente en dos corridas seguidas). **Sigue pendiente**: `tests/resilience/`
vacío, `auth-service` sin tests unitarios propios, y solo 12 de los ~22 tipos de evento del
catálogo tienen JSON Schema (el resto queda como `test.todo` explícito en
`tests/contract/src/events.contract-spec.ts`, no como cobertura fingida). Detalle completo
en `CLAUDE.md`.

El flujo completo de transferencia (auth → customer → account → payment → ledger) ya se
prueba automatizado de punta a punta — ver `tests/end-to-end/critical-flow.e2e-spec.ts`
arriba.

### 3.4 Deuda de persistencia — payment-service — RESUELTO (2026-07-31)

`payment-service/src/app.module.ts` ya no hardcodea `synchronize: true`: ahora usa
`database.config.ts` (mismo patrón `registerAs` que customer/account-service),
`synchronize: process.env.NODE_ENV === 'development'` y `migrationsRun` vía env var.
`typeorm.config.ts` (CLI) se deriva de la misma config y ya lista todas las entidades
(`PaymentOrmEntity`, `ProcessedEventOrmEntity`, `OutboxEventOrmEntity` — antes solo
tenía la primera, lo que habría roto `migration:generate`). Se añadió la migración
faltante de `processed_events` (antes solo existía vía `synchronize`) y scripts
`migration:generate`/`migration:revert` (antes solo había `migration:run`).

## 4. Entorno local (Windows)

- **No es repo git.** Cuidado antes de sobrescribir archivos: no hay historial ni diff.
- Compose: `npm run up` / `make up` (WSL/bash) o
  `.\scripts\compose.ps1 -Command up` (PowerShell nativo — único script en `scripts/`).
- **Solo `ledger-service` y `payment-service` están en `compose.yaml`** junto con la infra
  (postgres 16, redpanda v24.1.1 + console, prometheus, loki, tempo, grafana, otel-collector).
  auth, customer y account se corren a mano en local (`npm run start:dev`).
- Puertos: auth 3001, customer 3002, account 3003, ledger 3004, payment 3005,
  Grafana 3000 (admin/admin), Redpanda Console 8080, Postgres 5432 (postgres/postgres),
  brokers Kafka en `localhost:19092`.
- **Maven vendorizado** en `tools/maven/apache-maven-3.9.6/` — no asumir `mvn` en PATH.
- `.env` por servicio existen en disco pero están en `.gitignore` (junto con `*.pem`/`*.key`).
  Claves RS256 de auth se generan con `npm run keys:generate`.
- Observabilidad desplegada (Prometheus/Grafana/Loki/Tempo/OTel Collector) pero
  **ningún servicio está instrumentado con OTel todavía** — eso es fase 8.

## 5. Reglas de negocio no negociables (de `AGENTS.md`, aplican a todo código nuevo)

1. Partida doble obligatoria: Σ débitos = Σ créditos siempre.
2. Dinero nunca en float/double: enteros (centavos) + moneda, o `BigDecimal` en Java.
3. Asientos inmutables: corregir con reversiones, nunca editar un asiento publicado.
4. Idempotencia obligatoria: `Idempotency-Key` en comandos financieros; consumidores
   registran `event_id` procesados.
5. Transactional outbox: nunca publicar sin persistir en la misma transacción de BD
   (actualmente solo ledger-service lo cumple — ver §3.1).
6. Una BD por servicio: nunca compartir esquema ni entidades ORM entre servicios.
7. **Solo ledger-service toca saldos** — ni payment ni account los modifican directamente.
8. Envelope estándar de eventos (eventId, eventType, eventVersion, occurredAt, producer,
   correlationId, causationId, subjectId, data) sin PII innecesaria.
9. Arquitectura hexagonal obligatoria en todo servicio (ADR-007).

## 6. Cómo usar esta base de conocimiento

- Antes de afirmar "el evento X se publica" o "el servicio Y está probado", verificar en
  código — la documentación de arquitectura describe el diseño de fase 0, no siempre el
  estado real (aunque §3.1/§3.2/§3.4 ya están al día tras el pase de 2026-07-31).
- **§3.3 (cobertura de tests) — parcialmente resuelto (2026-08-06, fase 9 etapas 2-3)**:
  ya hay E2E y contrato reales (ver arriba). Sigue pendiente `tests/resilience/` y
  tests unitarios propios de `auth-service`.
- Al escribir servicios nuevos, seguir el patrón de outbox ya establecido en los
  servicios existentes (incluido risk-service en Python) en vez de reinventar uno
  nuevo — salvo que el servicio sea un consumidor terminal (notification-service,
  query-service) o un borde puro sin persistencia (api-gateway), que no necesitan
  outbox propio.
- **Bug de seguridad pre-existente encontrado al construir api-gateway** (y
  replicado en customer-service): `jwt-auth.guard.ts` en account-service y en
  customer-service caían a `jwt.decode()` sin verificar firma cuando
  `jwt.publicKeyPath` no resolvía — y no resolvía en ninguno de los dos, ya que
  ninguno registraba `jwt.config.ts`. Al containerizar ambos servicios
  (2026-08-01) se descubrió además que **tampoco declaraban `jsonwebtoken` en
  su `package.json`** — un `npm install` limpio (como el que hace un build de
  Docker, a diferencia de un `node_modules` local ya poblado) fallaba en tiempo
  de compilación, no solo en runtime. Se agregó la dependencia a ambos para
  desbloquear el build. **RESUELTO (2026-08-06, fase 9 etapa 1)**: se agregó
  `jwt.config.ts` a los dos servicios y se reescribieron ambos `jwt-auth.guard.ts`
  para fallar cerrado (`configService.getOrThrow('jwt.publicKeyPath')` +
  `readFileSync` directo, sin fallback inseguro) — verificado con el ataque
  documentado (JWT sin firma directo a `localhost:3002`/`3003`) devolviendo 401.
  Detalle completo en `CLAUDE.md`.
- Ver `docs/ROADMAP.md` para la secuencia tras fase 7 (completa): observabilidad
  OTel (fase 8), hardening (fase 9).
