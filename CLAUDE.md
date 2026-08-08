# CLAUDE.md

Guía para Claude Code en este repositorio. Complementa (no reemplaza) `AGENTS.md`, que
define el roadmap completo y las reglas de negocio con más detalle. Antes de asumir que
algo "ya está implementado", ver `docs/KNOWLEDGE_BASE.md` — documenta explícitamente dónde
la documentación de arquitectura diverge del código real (y qué se resolvió el 2026-07-31 y
el 2026-08-01, este último tras la primera corrida e2e real de punta a punta).

## Qué es esto

Core bancario event-driven personal/educativo. Microservicios en contenedores locales
(Docker Compose), sin cloud ni serverless. Generado originalmente con OpenCode
(multi-agente); ahora se continúa con Claude Code. **No es un repositorio git** — no hay
`.git`, no hay historial, no hay forma de hacer diff de versiones anteriores. Ir con
cuidado antes de sobrescribir archivos existentes.

## Estado actual (fases 0–7 completas)

| Servicio | Estado | Stack |
|---|---|---|
| auth-service | ✅ código real | NestJS, JWT RS256 + Argon2id, puerto 3001 |
| customer-service | ✅ código real, outbox | NestJS, puerto 3002 |
| account-service | ✅ código real, outbox, consume CustomerRegistered/Verified | NestJS, puerto 3003 |
| ledger-service | ✅ código real, outbox, consume AccountOpened | Java 21/Spring Boot 3.3/Flyway, puerto 3004 |
| payment-service | ✅ código real, outbox, saga real de riesgo | NestJS, puerto 3005 |
| risk-service | ✅ código real (mínimo viable) | Python/FastAPI, hexagonal, outbox propio, puerto 3006 |
| notification-service | ✅ código real (mínimo viable) | NestJS, hexagonal, consumidor puro (sin outbox), puerto 3007 |
| query-service | ✅ código real, 4 proyecciones CQRS | NestJS, hexagonal, consumidor puro (sin outbox), puerto 3008 |
| api-gateway | ✅ código real, JWT + rate limiting + proxy | NestJS, hexagonal delgada, sin BD/Kafka, puerto 3009 |
| web-app | ❌ **carpeta vacía** | planeada, fase 8+ |

No confundir carpeta existente con trabajo hecho: `apps/web-app/`, `libraries/*`,
`tests/{contract,end-to-end,resilience}/` siguen sin ni un archivo dentro.

## Levantar el entorno (Windows/PowerShell)

```powershell
.\scripts\compose.ps1 -Command up       # los 9 servicios + infra, todo containerizado
.\scripts\compose.ps1 -Command status
```

Los 9 servicios (auth, customer, account, ledger, payment, risk, notification,
query, api-gateway) están en `compose.yaml` — ya no hace falta correr nada "a
mano". `api-gateway` alcanza a los otros 8 por nombre de servicio en la red
Docker (`http://auth-service:3001`, etc.), no por `host.docker.internal`.

Para desarrollo con hot-reload de un servicio puntual, sigue disponible correrlo
localmente en paralelo (parando su contenedor primero para no chocar puertos):

```powershell
cd apps/auth-service; npm install; npm run keys:generate; npm run migration:run; npm run start:dev
```

Maven está vendorizado en `tools/maven/apache-maven-3.9.6/` — no asumir `mvn` en PATH al
tocar ledger-service. risk-service usa su propio venv (`apps/risk-service/.venv`,
`pip install -r requirements-dev.txt`) — ver `apps/risk-service/README.md`.
`npm run keys:generate` en auth-service debe correrse **antes** de
`docker compose build` — su Dockerfile copia `apps/auth-service/keys/` a la
imagen, y api-gateway monta `apps/auth-service/keys/public.pem` read-only para
validar JWT.

URLs: Grafana `localhost:3000` (admin/admin), Redpanda Console `localhost:8080`,
Postgres `localhost:5432` (postgres/postgres), Kafka brokers `localhost:19092`.

## Arquitectura hexagonal obligatoria

Todo servicio nuevo o modificado sigue esta estructura (ADR-007,
`docs/architecture/hexagonal-architecture.md`):

```
service/src/
├── domain/          # cero dependencias de frameworks: entities, value-objects, ports, exceptions
├── application/     # use-cases + dto; solo importa de domain/
├── infrastructure/  # implementa domain/ports/: persistence, messaging, config
└── presentation/    # controllers, guards, strategies
```

Reglas: `domain/` nunca importa de capas superiores; DI por tokens de símbolo
(`@Inject(USER_REPOSITORY)`); entidades ORM con sufijo `.orm-entity.ts` mapeadas por
`Mapper.toDomain()`/`toPersistence()`. Los servicios NestJS ya no tienen clases de evento
tipadas en `domain/events/` — desde que se migró a outbox, cada use-case construye el
envelope inline con un helper (`buildEventEnvelope`/`buildPaymentEventEnvelope`) en vez de
instanciar `new XEvent(...)` y pasarlo a un `EventPublisher`.

## Reglas de negocio no negociables

1. Partida doble: Σ débitos = Σ créditos siempre.
2. Dinero nunca en float/double — enteros (centavos) + moneda, o `BigDecimal` en Java.
   En el wire, hasta ledger-service serializa `amount` como entero en centavos
   (`Money.toCents()`), aunque internamente siga usando `BigDecimal`.
3. Asientos inmutables — corregir con reversiones, nunca editar un asiento publicado.
4. `Idempotency-Key` obligatorio en comandos financieros; consumidores registran
   `event_id` procesados en `processed_events` (no reprocesar).
5. Transactional outbox: nunca publicar un evento sin guardarlo en la misma transacción
   de BD. **Los 6 servicios con código real lo cumplen** (customer/account/payment vía
   `OutboxEvent`+`TransactionRunner`+`OutboxPublisherWorker` en TypeScript; ledger y risk
   con el mismo patrón en Java/Python respectivamente).
6. Una BD por servicio — nunca leer tablas ni compartir entidades ORM de otro servicio.
   Cuando un servicio necesita datos de otro, mantiene su propia proyección local
   alimentada por eventos (ver `customer_projections` en account-service).
7. **Solo `ledger-service` toca saldos** — ni payment ni account los modifican directamente.
8. Envelope estándar de eventos (eventId, eventType, eventVersion, occurredAt, producer,
   correlationId, causationId, subjectId, data) sin PII innecesaria.

## Deuda técnica conocida (verificar código antes de asumir que sigue igual)

Resuelta el 2026-07-31 (ver `docs/KNOWLEDGE_BASE.md` para el detalle completo):
outbox en los 3 servicios NestJS, coreografía de eventos del flujo crítico
(CustomerRegistered/Verified → account-service, AccountOpened → ledger-service,
AccountBalanceChanged/LedgerTransactionRejected desde ledger-service), saga de riesgo
real con risk-service nuevo, y fix de `synchronize: true` en payment-service.

Sigue pendiente:

- **Cobertura de tests real**: auth-service sigue sin tests unitarios propios (deuda
  documentada, `make test-unit` lo corre con `--passWithNoTests` para no romper la
  cadena). El resto de servicios tiene tests unitarios del código tocado en pases de
  deuda técnica anteriores. **RESUELTO (2026-08-06, fase 9 etapa 2): `make test` ya
  no es un TODO** — corre los 9 unitarios (`test-unit`: 7 `npm test` NestJS + `mvn
  test` en ledger-service vía el Maven vendorizado + `pytest` en risk-service) y un
  suite E2E nuevo (`test-e2e`, `tests/end-to-end/`) que reproduce el flujo crítico
  completo (`requests/banking.http`) black-box contra api-gateway con el stack real
  levantado, incluyendo reintentos por consistencia eventual (KYC→apertura de cuenta,
  AccountOpened→ledger) y polling de la saga de pago hasta estado terminal — verificado
  dos corridas seguidas, ambas verdes. De paso corrigió una aserción de test obsoleta
  en `MoneyTest.add_rejectsCurrencyMismatch` (esperaba `InvalidMoneyException`, el
  código ya lanza el más específico `CurrencyMismatchException`) que bloqueaba `mvn
  test`. **RESUELTO (2026-08-06, fase 9 etapa 3): tests de contrato reales** —
  `tests/contract/` (ajv, draft 2020-12) valida el envelope y el payload de cada
  evento contra `contracts/json-schema/`, usando de preferencia los eventos reales
  capturados por `test-e2e` (`tests/end-to-end/captured-events/latest.json`, 16
  eventos/10 tipos de una corrida real) y 2 fixtures sintéticas para
  `PaymentRejected`/`PaymentRejectedByRisk` (el flujo feliz nunca los dispara). De
  paso encontró y corrigió un mismatch real: el schema de `LedgerTransactionPosted`
  exigía `paymentId` como `string` no-nullable, pero ledger-service legítimamente
  emite `paymentId: null` en depósitos/retiros (no están asociados a un pago) —
  corregido a `["string", "null"]`. **Hueco documentado, no escondido**: de los 22
  tipos de evento activos en `docs/events/catalog.md` (excluyendo `FundsHeld`/
  `FundsReleased`, diferidos), solo 12 tienen JSON Schema — los 10 restantes
  (`CustomerVerified`, `CustomerSuspended`, `CustomerContactUpdated`,
  `AccountFrozen`, `AccountClosed`, `LedgerTransactionReversed`, `PaymentFailed`,
  `PaymentReversalRequested`, `PaymentReversed`, `PaymentFlaggedForReview`)
  aparecen como `test.todo` explícito en `events.contract-spec.ts`, no como
  cobertura fingida. **RESUELTO (2026-08-06, fase 9 etapa 4): `make seed` real**
  — `tests/end-to-end/src/seed.ts` (reutiliza los mismos helpers HTTP del E2E,
  no es un test de Jest) corre una vez el flujo feliz completo con una identidad
  de demo fija (`demo@banking.local`) y deja el stack con 1 cliente verificado,
  2 cuentas EUR, un depósito de 1000.00 y una transferencia de 250.00 completada
  — listo para explorar a mano en Swagger/Grafana/Redpanda Console. Idempotente:
  si el cliente demo ya existe, no repite la creación de cuentas — reporta el
  estado actual y termina (verificado con dos corridas seguidas: la primera
  crea todo, la segunda detecta el estado existente y no hace nada más).
- **`FundsHeld`/`FundsReleased` deliberadamente no implementados** — diseño de fase 0
  para un flujo hold/capture que el saga actual (ADR-006, posting directo) no usa. No es
  un gap a "arreglar", es una decisión documentada en `docs/architecture/ledger-service.md`.
- **`payment-service`'s risk-service integration** es mínima: reglas de límite por
  transacción y límite diario acumulado. Sin lista de bloqueo ni detección de velocidad
  (quedaron fuera del alcance mínimo viable — ver `docs/ROADMAP.md` 7.1).
- **notification-service solo tiene el canal `LOG`** (simulado) — sin
  SMTP/SMS/push real, sin motor de plantillas (`Template`/`Preference` de
  bounded-contexts.md son diseño de fase 0, no implementados). Ver
  `docs/architecture/notification-service.md`.
- **query-service sin extractos ni búsqueda por correlationId** — diferido (YAGNI),
  ver `docs/architecture/query-service.md`. Límite conocido: si `AccountOpened` llega
  antes que `CustomerRegistered`, el `accountCount` de ese dashboard no se incrementa
  (sin reconciliación implementada).
- **api-gateway sin autorización por scopes** — solo valida que el JWT sea válido
  (firma/issuer/audience/exp), no aplica un mapeo ruta→scope todavía (no existe esa
  tabla en ningún otro lado del repo hoy — YAGNI). Sin mTLS/token interno de
  servicio-a-servicio (fase 9). Ver `docs/architecture/api-gateway.md`.
- **`ledger-service` y `payment-service` no verifican JWT en absoluto** — hallazgo
  del repaso STRIDE de fase 9 (2026-08-06, `docs/threat-model/stride-transfer-flow.md`).
  A diferencia del bug de arriba (JWT decodificado sin verificar firma),
  `ledger-service` no tiene ni siquiera `spring-boot-starter-security` en el
  classpath, y `payment-service` no tiene `@UseGuards` en ningún controller — cero
  autenticación, no una verificación rota. `POST /deposit`, `/withdraw`,
  `/transfer`, `/reverse` (ledger, puerto host 3004) y `POST /api/payments/transfer`
  (payment, puerto host 3005) son alcanzables directo desde `localhost`, saltándose
  api-gateway por completo. `query-service` y `notification-service` tienen el
  mismo problema del lado de lectura (exponen datos de cualquier `customerId` sin
  autorizar). Es el ítem más urgente de fase 9 — ver el threat model actualizado
  para el detalle de los 6 hallazgos y el orden de mitigación recomendado.
- ~~`account-service` y `customer-service` tienen el mismo bug de seguridad
  pre-existente en su guard JWT propio~~ — **RESUELTO (2026-08-06, fase 9 etapa
  1)**. Ambos servicios caían a `jwt.decode()` sin verificar firma cuando
  `jwt.publicKeyPath` no resolvía (nunca resolvía — ninguno registraba un
  `jwt.config.ts`), aceptando cualquier token con forma de JWT si se les pegaba
  directo, bypaseando la verificación RS256 real de api-gateway. Con ambos
  puertos mapeados al host (3002/3003) desde la containerización, esto pasó de
  riesgo teórico a explotable en vivo (confirmado antes del fix: un JWT sin
  firma devolvía 200/404 en vez de 401). Corregido agregando `jwt.config.ts` a
  los dos servicios (mismo patrón que `api-gateway/src/infrastructure/config/
  jwt.config.ts`) y reescribiendo ambos `jwt-auth.guard.ts` para fallar cerrado:
  `configService.getOrThrow('jwt.publicKeyPath')` + `readFileSync` directo (sin
  el `existsSync` que permitía degradar), igual que
  `api-gateway/src/infrastructure/auth/rs256-token-verifier.ts` — si la clave no
  resuelve, el servicio ya no arranca, no acepta tokens sin firma. `compose.yaml`
  actualizado con `JWT_PUBLIC_KEY_PATH`/`JWT_ISSUER`/`JWT_AUDIENCE` y el mismo
  bind mount de `public.pem` que ya usaba api-gateway. Verificado: el ataque
  documentado ahora devuelve 401 en ambos servicios, y un JWT real emitido por
  auth-service sigue autenticando correctamente.

Detalle completo con archivos y líneas de referencia: `docs/KNOWLEDGE_BASE.md`.

## Verificación e2e real (2026-08-01) — bugs encontrados y corregidos

Se containerizaron auth/customer/account (antes "a mano") y se corrió el flujo
completo de punta a punta a través de `api-gateway` por primera vez: registro →
login → alta de cliente → KYC → apertura de 2 cuentas → depósito → transferencia
→ saga de riesgo → posting en ledger → proyecciones de query-service →
notificación. Esto expuso **6 bugs reales que nunca se habían ejercitado en un
flujo integrado** (todo el trabajo previo se validó con mocks/unitarios, nunca
contra Postgres/Kafka reales encadenados):

1. **`auth-service` no arrancaba**: `PresentationModule` no re-exportaba
   `InfrastructureModule` desde `ApplicationModule`, así que `JwtStrategy` no
   podía resolver `USER_REPOSITORY` — corregido en
   `apps/auth-service/src/application/application.module.ts` (`exports:
   [...useCases, InfrastructureModule]`).
2. **`auth-service`'s `HealthController` tampoco arrancaba**: le faltaba
   `TerminusModule` importado directo en `PresentationModule` (solo estaba en
   `AppModule`) — corregido en
   `apps/auth-service/src/presentation/presentation.module.ts`.
3. **`payment-service` en `compose.yaml` no tenía `DATABASE_MIGRATIONS_RUN`** —
   `outbox_events` nunca se creaba. Corregido agregando la variable. (Requirió
   además resetear manualmente `payment_db` — tenía una tabla `payments` de
   pruebas viejas de antes del fix de `synchronize:true`, sin fila en
   `migrations`, que bloqueaba correr las migraciones reales.)
4. **`risk-service`'s Dockerfile nunca corría `alembic upgrade head`** — el
   `CMD` arrancaba `uvicorn` directo, así que `risk_db` jamás tuvo tablas fuera
   de los tests con SQLite. Corregido en `apps/risk-service/Dockerfile`.
5. **`outbox_events.aggregate_id` era `varchar(26)` en payment-service Y en
   risk-service** — dimensionado para un ULID pelado (26 chars), pero
   `payment.id` tiene el prefijo `pay_` (30 chars). Cualquier evento de
   payment-service o de risk-service sobre un pago fallaba el insert. Corregido
   a `varchar(64)` en ambas migraciones
   (`apps/payment-service/src/migrations/1721900000000-*.ts`,
   `apps/risk-service/alembic/versions/0001_*.py`).
6. **`payment-service` llamaba a `POST /api/ledger/transfer` con el monto en
   centavos** (`payment.amount.amount`, entero) **cuando ledger-service espera
   un `BigDecimal` decimal** (ej. `100.00` para 100 EUR) — un pago de 100 EUR se
   interpretaba como 10.000 EUR y siempre fallaba con `InsufficientFunds`.
   Corregido en
   `apps/payment-service/src/infrastructure/http/ledger-http.client.ts`:
   `amount: (params.amount / 100).toFixed(2)`.
7. **`ledger_entries.accountId` en los eventos y en la respuesta REST de
   ledger-service era el ID interno de `LedgerAccount` (`ledgerAccountId`), no
   la referencia externa a account-service** (`LedgerAccount.getAccountId()`) —
   encontrado al armar `requests/banking.http` y probar
   `GET /api/query/accounts/:id/transactions`, que siempre volvía vacío pese a
   que la cuenta sí tenía movimientos. `LedgerEntry` (dominio) solo guardaba
   `ledgerAccountId`; se le agregó el campo `accountId` (String, externo),
   se actualizaron sus factory methods (`debit`/`credit`/`reconstruct`) y los 4
   use-cases que los llaman (deposit/withdraw/transfer/reverse), la entidad JPA
   + su mapper, `EventEnvelopeFactory.toEntryMaps()` y `TransactionResultMapper`
   (ambos usaban `getLedgerAccountId()` en vez de `getAccountId()`), y se sumó
   la migración Flyway `V4__add_account_id_to_ledger_entries.sql` (agrega la
   columna y la rellena desde `ledger_accounts` para las filas existentes).
   Verificado con una corrida e2e nueva: `entries[].accountId` en la respuesta
   de depósito/transferencia y `/api/query/accounts/:id/transactions` ya
   muestran el accountId real.

Ninguno de estos bugs era nuevo — todos eran alcanzables desde antes de esta
sesión, simplemente nunca se había corrido el flujo completo contra servicios
reales. **Regla derivada**: no asumir que un servicio "funciona" solo porque sus
tests unitarios (con mocks) pasan — recién con un flujo e2e real contra
Postgres/Kafka se detectan bugs de wiring de módulos, migraciones no conectadas,
y mismatches de contrato HTTP entre servicios.

## Fase 8 — Observabilidad OTel end-to-end (2026-08-02)

Los 9 servicios están instrumentados con OpenTelemetry: SDK Node (`@opentelemetry/
sdk-node` + auto-instrumentations, cargado antes de `main.js` vía `node -r`) en los
7 servicios NestJS, javaagent en ledger-service (Java), `opentelemetry-instrument`
en risk-service (Python). `correlationId`/`causationId` del envelope ahora son el
`traceId`/`spanId` del span activo, no un id de negocio — incluyendo sobre el
patrón outbox, donde el publisher corre en un tick de polling desconectado del
request original y por eso hubo que reconstruir el contexto remoto a mano antes de
publicar a Kafka (`trace-context.util.ts` en customer/account/payment-service;
construcción/extracción manual de `traceparent` en risk-service, que usa
`confluent-kafka` sin auto-instrumentación disponible). **Verificado con una
transferencia real de punta a punta**: una sola traza en Tempo cruza api-gateway →
payment-service → risk-service → ledger-service → notification-service →
query-service. Métricas de negocio nuevas: `banking_ledger_balance_imbalance`
(Micrometer/Actuator, confirmado en 0.0), `banking_payments_by_status` (payment-
service, `prom-client`), `banking_risk_evaluations_total` (risk-service,
`prometheus_client`), lag de consumidores vía las métricas nativas de Redpanda
(`redpanda_kafka_max_offset` - `redpanda_kafka_consumer_group_committed_offset`,
sin código nuevo). Dashboard de Grafana provisionado por archivo
(`platform/observability/grafana/provisioning/dashboards/banking-overview.json`).
Detalle completo en `docs/ROADMAP.md` fase 8.

De paso se corrigió un bug de logging pre-existente en ledger-service
(`GlobalExceptionHandler`'s handler genérico de `Exception` no logueaba nada antes
de devolver el 500 — cualquier error interno era invisible incluso mirando los
logs, encontrado al depurar durante esta verificación).

## Siguiente paso: fase 9 (hardening)

Ver `docs/ROADMAP.md` para el detalle de lo que queda pendiente (tests E2E
automatizados, mTLS, STRIDE revisitado, escaneo de imágenes, backups).

## Convenciones

- Conventional Commits (aunque no hay git todavía en este directorio).
- Cada servicio expone `/health` y `/ready`.
- Config por variables de entorno, nunca hardcodeada.
- Secretos nunca en código ni en imágenes (`.env` en `.gitignore`).
- Imágenes con hashes fijos, nunca `latest`; usuario no-root en contenedores.

## Referencias

- `AGENTS.md` — roadmap completo de 11 fases + reglas de negocio detalladas.
- `docs/KNOWLEDGE_BASE.md` — auditoría código-vs-docs con referencias de archivo/línea.
- `docs/ROADMAP.md` — plan de continuación desde el resto de fase 7.
- `docs/phases/00-05-mvp-status.md` — estado detallado de fases 0–6.
- `docs/adr/` — decisiones de arquitectura (Redpanda, monorepo, outbox, auth, saga, hexagonal).
- `docs/events/catalog.md` — catálogo de eventos (nota: `FundsHeld`/`FundsReleased`
  marcados como diferidos, ver arriba).
