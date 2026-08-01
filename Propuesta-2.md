# Roadmap: Core Bancario Orientado a Eventos (Contenedores)

Proyecto personal ambicioso pero realista: un **core bancario** con reglas de negocio, arquitectura de microservicios orientada a eventos, autenticación segura y todo 100 % en contenedores (Docker + Kubernetes local). Sin serverless ni proveedores cloud.

Tecnologías permitidas: **TypeScript/JavaScript**, **Java**, **Python**.

---

## Visión de alto nivel

```
[Clientes / API Gateway]
         │
         ▼
┌─────────────────────┐
│  Identity & Auth    │  (Keycloak / custom JWT + mTLS)
└─────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              API Gateway (Kong / Traefik)            │
└─────────────────────────────────────────────────────┘
         │
    ┌────┴────┬────────────┬────────────┬────────────┐
    ▼         ▼            ▼            ▼            ▼
Accounts  Transfers   Ledger      Cards/     Notifications
Service   Service     (Core)      Payments   Service
    │         │            │            │            │
    └─────────┴────────────┴────────────┴────────────┘
                         │
                         ▼
              Event Bus (Kafka / Redpanda)
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
         Audit Log            Analytics / Reporting
```

**Principios clave:**
- Event-Driven Architecture (EDA) + CQRS ligero
- Cada microservicio dueño de su base de datos
- Todo containerizado desde el día 1
- Idempotencia, consistencia eventual y sagas para operaciones distribuidas
- Seguridad first: OAuth2/OIDC, mTLS interno, secrets management

---

## Stack tecnológico recomendado

| Capa                    | Tecnología                          | Lenguaje     | Motivo |
|-------------------------|-------------------------------------|--------------|--------|
| Auth / Identity         | Keycloak (o custom con NestJS)      | Java / TS    | Estándar bancario, OIDC/OAuth2 |
| API Gateway             | Traefik o Kong                      | -            | Routing, rate-limit, JWT |
| Event Bus               | Redpanda o Apache Kafka             | -            | Alto rendimiento, compatible Kafka |
| Microservicios (core)   | Spring Boot 3 + Spring Cloud        | **Java**     | Madurez financiera, transacciones |
| Microservicios (rápidos)| NestJS o Fastify                    | **TypeScript** | DX excelente, tipado |
| Servicios de datos / ML | FastAPI                             | **Python**   | Reportes, fraud detection simple |
| Bases de datos          | PostgreSQL (por servicio) + Redis   | -            | ACID + cache |
| Ledger contable         | PostgreSQL + event sourcing         | Java/TS      | Doble partida |
| Orquestación            | Docker Compose → Kind/K3s/Minikube  | -            | Local full stack |
| Observability           | OpenTelemetry + Grafana + Loki + Tempo | -         | Trazas, logs, métricas |
| CI/CD local             | GitHub Actions (self-hosted) o Tekton | -          | Todo en contenedores |
| Secrets                 | HashiCorp Vault o SOPS + sealed-secrets | -        | Sin secretos en plain text |
| Messaging interno       | Kafka + schema registry (Avro/Protobuf) | -         | Contratos de eventos |

---

## Fases del Roadmap

### Fase 0: Fundamentos (1–2 semanas)
**Objetivo:** Entorno reproducible y cultura de contenedores.

- [ ] Monorepo (recomendado: Nx, Turborepo o simple estructura con carpeta `/services`)
- [ ] Docker + Docker Compose base
- [ ] Makefile / Taskfile para comandos comunes (`make up`, `make test`, `make migrate`)
- [ ] Estructura de carpetas:
  ```
  /infra
    /docker
    /k8s
    /kafka
  /services
    /identity
    /accounts
    /ledger
    /transfers
    /gateway
  /libs (shared contracts, proto/avro, utils)
  /docs
  ```
- [ ] PostgreSQL + Redis + Redpanda (o Kafka) en Compose
- [ ] Observability mínima (Prometheus + Grafana)
- [ ] Convenciones: Conventional Commits, linting (ESLint, Checkstyle, Ruff), pre-commit hooks

**Entregable:** `docker compose up` levanta infra base + un “hello world” service.

---

### Fase 1: Identity & Security Foundation (2–3 semanas)
**Objetivo:** Autenticación y autorización sólidas antes de cualquier lógica de negocio.

1. **Desplegar Keycloak** en contenedor (realm `bank-core`)
   - Clientes: `bank-web`, `bank-mobile`, `service-to-service`
   - Flujos: Authorization Code + PKCE, Client Credentials
   - Roles: `CUSTOMER`, `ADMIN`, `AUDITOR`, `SERVICE`
2. **API Gateway** (Traefik o Kong) con validación JWT
3. **mTLS** opcional entre servicios (o al menos network policies en K8s)
4. Servicio `identity-service` (NestJS o Spring) que envuelve Keycloak o implementa custom claims
5. Middleware de autenticación reutilizable en todos los lenguajes
6. Rate limiting y circuit breakers básicos
7. Secrets con Docker secrets o Vault dev mode

**Reglas de seguridad mínimas:**
- Nunca contraseñas en logs
- Tokens de corta duración + refresh
- Auditoría de login (eventos a Kafka)
- Principle of least privilege

**Entregable:** Login funcional + protección de endpoints + eventos de auth en el bus.

---

### Fase 2: Core Domain – Cuentas y Ledger (3–5 semanas)
**Objetivo:** El corazón contable con doble partida y event sourcing ligero.

#### Microservicios principales

| Servicio              | Responsabilidad                              | Lenguaje     | DB          |
|-----------------------|----------------------------------------------|--------------|-------------|
| `accounts-service`    | Alta de clientes, apertura de cuentas, límites | Java / TS   | PostgreSQL |
| `ledger-service`      | Libro mayor (double-entry), saldos, asientos | **Java**    | PostgreSQL |
| `customer-service`    | Datos KYC básicos, perfiles                  | TS / Python | PostgreSQL |

#### Reglas de negocio clave (empezar aquí)
- Cada movimiento genera **al menos dos asientos** (debe = haber)
- Idempotency-Key en todas las operaciones de dinero
- Saldos nunca negativos (salvo cuentas de crédito)
- Estados de cuenta: `PENDING`, `ACTIVE`, `FROZEN`, `CLOSED`
- Eventos de dominio: `AccountOpened`, `AccountFrozen`, `BalanceChanged`, `EntryPosted`

#### Diseño del Ledger (recomendado)
- Tabla `journal_entries` + `ledger_accounts`
- Event sourcing: guardar el evento y proyectar el saldo
- Snapshotting periódico de saldos
- Versionado optimista (optimistic locking)

**Patrones:**
- Outbox pattern (para publicar eventos de forma confiable)
- CQRS simple: comandos escriben, queries leen de proyecciones
- Saga coreografiada para operaciones multi-cuenta

**Entregable:** Crear cuenta → depositar → retirar → consultar saldo con consistencia y eventos publicados.

---

### Fase 3: Transferencias y Orquestación (3–4 semanas)
**Objetivo:** Movimientos entre cuentas con garantías.

- `transfers-service` (TypeScript o Java)
- Flujo:
  1. Validar fondos (sync o async)
  2. Reservar dinero (hold)
  3. Publicar `TransferInitiated`
  4. Ledger confirma ambos asientos
  5. `TransferCompleted` o `TransferFailed` (compensación)
- Implementar **Saga** (coreografiada con Kafka o orquestada con un pequeño orchestrator)
- Timeouts y reintentos con dead-letter topic
- Límites diarios / por transacción
- Detección básica de fraude (reglas simples en Python o en el propio servicio)

**Eventos importantes:**
- `TransferInitiated`
- `FundsReserved`
- `FundsReleased`
- `TransferCompleted`
- `TransferRejected`

**Entregable:** Transferencia entre dos cuentas con rollback completo si falla.

---

### Fase 4: Event-Driven Ecosystem & Integrations (2–3 semanas)
- Schema Registry (Apicurio o Confluent) + Avro/Protobuf
- Contratos de eventos versionados en `/libs/events`
- Consumidores:
  - `notification-service` (email/SMS mock, Python o NestJS)
  - `audit-service` (todo va al log inmutable)
  - `reporting-service` (materialized views o ClickHouse local)
  - `fraud-service` (reglas en Python)
- Dead Letter Queues + replay de eventos
- Exactly-once o at-least-once + idempotencia

---

### Fase 5: Productos adicionales (opcional, 2–4 semanas c/u)
Prioriza según interés:

1. **Tarjetas / Payments** (autorizaciones + clearing)
2. **Préstamos / Créditos** (amortización, intereses)
3. **Multi-currency** + tipos de cambio
4. **Statement generation** (PDF con Python)
5. **Open Banking** estilo PSD2 (APIs de consentimiento)

---

### Fase 6: Hardening, Observability y Producción local (continuamente)
- OpenTelemetry en todos los servicios (trazas distribuidas)
- Grafana dashboards: latencia, error rate, throughput, lag de Kafka
- Alertas básicas
- Chaos testing ligero (matar pods, cortar red)
- Backup de PostgreSQL + Redis
- NetworkPolicies en Kubernetes
- Escaneo de vulnerabilidades (Trivy) en CI
- Policy as Code (OPA/Gatekeeper) opcional
- Documentación con AsyncAPI + OpenAPI
- Tests de contrato (Pact o similar)
- Load testing (k6)

**Objetivo de madurez:** Poder destruir todo el cluster y levantarlo de nuevo con un solo comando (`make bootstrap`).

---

## Orden de implementación recomendado (MVP en ~3 meses)

| Sprint | Foco                              | Servicios / Componentes                  |
|--------|-----------------------------------|------------------------------------------|
| 1      | Infra + Compose + Observability   | Redpanda, Postgres, Redis, Grafana      |
| 2      | Auth completa                     | Keycloak + Gateway + JWT middleware     |
| 3–4    | Accounts + Ledger                 | accounts-service + ledger-service       |
| 5      | Transferencias + Saga             | transfers-service                       |
| 6      | Eventos + Notificaciones + Audit  | consumers + schema registry             |
| 7      | Kubernetes local (Kind/K3s)       | Helm charts o Kustomize                 |
| 8      | Hardening + tests de carga        | Seguridad, chaos, k6                    |

---

## Estructura de un microservicio típico (ejemplo Java + Spring)

```
services/ledger-service/
├── Dockerfile
├── src/main/java/...
│   ├── api/              # Controllers (comandos y queries)
│   ├── application/      # Casos de uso / handlers
│   ├── domain/           # Entidades, value objects, reglas de negocio
│   ├── infrastructure/
│   │   ├── persistence/
│   │   ├── messaging/    # Kafka producers/consumers + Outbox
│   │   └── config/
│   └── LedgerApplication.java
├── src/test/
└── build.gradle.kts
```

Para TypeScript (NestJS) el diseño es análogo (modules, domain, application, infrastructure).

---

## Reglas de negocio mínimas que debes codificar desde el inicio

1. **Doble partida contable** obligatoria
2. **Idempotencia** en todos los endpoints de escritura
3. **Optimistic locking** + versionado de agregados
4. **Outbox pattern** (nunca publicar evento sin haber guardado en DB de forma atómica)
5. **Saldos calculados** (no confiar solo en un campo `balance` mutable)
6. **Inmutabilidad** de asientos contables (solo se pueden revertir con asientos contrarios)
7. **Auditoría completa** (quién, qué, cuándo, desde dónde)
8. **Límites y políticas** configurables (por tipo de cuenta, por cliente)

---

## Cómo arrancar esta misma semana

```bash
# Día 1-2
mkdir bank-core && cd bank-core
# Crear docker-compose.yml con:
# - redpanda
# - postgres (múltiples DBs)
# - redis
# - keycloak
# - traefik
# - grafana + prometheus + loki

# Día 3-5
# Subir Keycloak + un servicio "accounts" mínimo en NestJS o Spring
# Proteger un endpoint con JWT
# Publicar un evento AccountCreated a Kafka
```

---

## Riesgos y cómo mitigarlos

| Riesgo                          | Mitigación                              |
|---------------------------------|-----------------------------------------|
| Complejidad de sagas            | Empezar con coreografía simple + outbox |
| Consistencia eventual confusa   | Diseñar bien las proyecciones y UI      |
| Demasiados lenguajes            | Máximo 2 lenguajes al principio (Java + TS) |
| Secretos y certificados         | Vault dev + cert-manager local          |
| Debilidad de pruebas            | Contract tests + testcontainers         |
| Scope creep                     | MVP = Cuentas + Ledger + Transferencias |

---

## Próximos pasos concretos que te propongo

1. ¿Quieres que te genere el **docker-compose.yml** base + estructura de monorepo?
2. ¿Prefieres empezar el core (`ledger` + `accounts`) en **Java/Spring Boot** o en **TypeScript/NestJS**?
3. ¿Keycloak o prefieres un auth service custom más ligero?
4. ¿Usamos **Redpanda** (más fácil) o Kafka “puro”?

Dime por dónde quieres que baje el siguiente nivell de detalle (código de ejemplo de outbox, diseño del ledger, helm charts, etc.) y lo construimos juntos. 

¡Este proyecto puede convertirse en un portfolio brutal y en un aprendizaje profundo de sistemas distribuidos financieros!
