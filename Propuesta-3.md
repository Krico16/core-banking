# 🏦 Roadmap: Core Bancario Event-Driven con Microservicios

Excelente proyecto — un core bancario es de los mejores dominios para aprender arquitectura de eventos porque **la consistencia y auditabilidad son requisitos reales, no artificiales**. Aquí tienes un roadmap completo, pensado para desarrollarse 100% en contenedores.

---

## 🎯 Visión general de la arquitectura

```
                        ┌──────────────┐
   Cliente ──────────▶  │ API Gateway  │ ──▶ Auth Service (OAuth2/OIDC)
                        └──────┬───────┘
                               │ REST/gRPC
        ┌──────────────┬───────┴──────┬──────────────┐
        ▼              ▼              ▼              ▼
   ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │Customers│   │ Accounts │   │ Ledger / │   │ Payments │
   │ Service │   │ Service  │   │ Transac. │   │ Service  │
   └────┬────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
        │             │              │              │
        └─────────────┴──── Kafka ───┴──────────────┘
                     (Event Backbone)
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        Notifications    Fraud/Rules      Audit/Reporting
```

### Stack recomendado (todo containerizable)

| Componente | Tecnología sugerida | Por qué |
|---|---|---|
| Servicios core (Ledger, Accounts) | **Java + Spring Boot** | Transaccionalidad, madurez en banca, tipado fuerte |
| Servicios de soporte (Notificaciones, API Gateway custom) | **TypeScript + NestJS** | Velocidad de desarrollo, arquitectura modular similar a Spring |
| Motor de reglas / Fraude / Reporting | **Python + FastAPI** | Ideal para lógica de reglas y análisis |
| Event backbone | **Apache Kafka** (o RabbitMQ para empezar) | Estándar de facto en event-driven |
| Auth | **Keycloak** (self-hosted, en contenedor) | OAuth2/OIDC completo sin proveedores cloud |
| Bases de datos | **PostgreSQL** (una por servicio) + Redis | ACID para el ledger, cache/sesiones |
| Orquestación | **Docker Compose** → **Kubernetes (k3s/kind)** | Progresión natural |
| Observabilidad | Prometheus + Grafana + Loki + Jaeger | Todo open source y en contenedores |

---

## 📅 Roadmap por fases

### Fase 0 — Fundaciones y diseño del dominio (1-2 semanas)

**Objetivo:** No escribir código de negocio todavía. Diseñar el dominio.

- [ ] Modelar el dominio con **Domain-Driven Design (DDD)**: identifica bounded contexts (Clientes, Cuentas, Ledger, Pagos, Fraude)
- [ ] Hacer un **Event Storming** (aunque sea solo, en Miro/papel): define los eventos del sistema:
  - `CustomerRegistered`, `AccountOpened`, `FundsDeposited`, `FundsWithdrawn`, `TransferInitiated`, `TransferCompleted`, `TransferRejected`, `FraudDetected`
- [ ] Definir reglas de negocio iniciales:
  - No sobregiros (o límite configurable)
  - Límites diarios de transferencia
  - KYC básico antes de operar
  - Doble entrada contable (todo débito tiene un crédito)
- [ ] Setup del monorepo o multi-repo, convención de commits, `.editorconfig`
- [ ] **Docker Compose base**: PostgreSQL, Kafka + Zookeeper (o Kafka KRaft), Redis, Keycloak

> 💡 Entregable: diagrama C4 (contexto y contenedores) + catálogo de eventos documentado (AsyncAPI es ideal para esto).

---

### Fase 1 — Primer servicio + Autenticación (2-3 semanas)

**Objetivo:** Un servicio funcionando end-to-end con seguridad real.

- [ ] **Keycloak en contenedor**: realm propio, clientes OAuth2, roles (`customer`, `admin`, `auditor`)
- [ ] **Customer Service** (Java/Spring Boot o NestJS):
  - CRUD de clientes con estados KYC (`PENDING`, `VERIFIED`, `BLOCKED`)
  - Validación de JWT emitidos por Keycloak (flujo Authorization Code + PKCE)
  - Publica `CustomerRegistered` a Kafka
- [ ] Dockerfile multi-stage para el servicio (imagen final mínima, usuario no-root)
- [ ] Migraciones de BD con Flyway/Liquibase (Java) o Prisma/TypeORM (TS)
- [ ] Tests: unitarios + integración con **Testcontainers** (levanta Postgres/Kafka reales en tests)

> 💡 Hito: puedes registrarte, obtener un token de Keycloak y consumir el API autenticado, todo con `docker compose up`.

---

### Fase 2 — El corazón: Accounts + Ledger con Event Sourcing (3-4 semanas)

**Objetivo:** La parte más interesante técnicamente. Aquí es donde brilla lo event-driven.

- [ ] **Account Service**: apertura de cuentas, estados, vinculación a clientes (escucha `CustomerRegistered` — solo clientes verificados pueden abrir cuenta)
- [ ] **Ledger Service** (recomiendo Java aquí):
  - **Contabilidad de doble partida**: cada movimiento genera asientos débito/crédito
  - **Event Sourcing**: el saldo NO se guarda como columna mutable; se deriva de la secuencia de eventos (`FundsDeposited`, `FundsWithdrawn`). Guarda snapshots para performance
  - Patrón **Transactional Outbox**: escribir el evento en la misma transacción de BD y publicarlo a Kafka con un relay (o Debezium CDC)
  - **Idempotencia**: cada comando lleva `idempotency-key`; reintentos no duplican movimientos
  - Control de concurrencia optimista (versión del agregado)
- [ ] Reglas de negocio en el ledger: fondos insuficientes, cuenta bloqueada, límites
- [ ] Proyecciones de lectura (CQRS): un consumidor construye vistas de saldos/movimientos en tablas de lectura

> ⚠️ Regla de oro bancaria: usa `DECIMAL`/`BigDecimal` para dinero, **jamás floats**. Mejor aún: representa montos en unidades mínimas (centavos) como enteros + moneda.

---

### Fase 3 — Transferencias y Sagas (2-3 semanas)

**Objetivo:** Coordinación entre servicios sin transacciones distribuidas.

- [ ] **Payments/Transfer Service**: orquesta transferencias entre cuentas
- [ ] Implementar el patrón **Saga** (coreografía u orquestación):
  1. `TransferInitiated` → reserva de fondos (débito pendiente)
  2. Validación de fraude/límites
  3. `TransferCompleted` → confirmación del crédito
  4. Si algo falla → **compensación**: `TransferRejected` + liberación de fondos
- [ ] Manejo de fallos: reintentos con backoff, **Dead Letter Queue** para eventos venenosos
- [ ] **Fraud/Rules Service** (Python + FastAPI): consume eventos de transferencia, aplica reglas (montos inusuales, velocidad de transacciones, listas negras) y emite `FraudDetected`

> 💡 Hito: puedes matar un servicio a mitad de una transferencia y el sistema se recupera sin perder ni duplicar dinero. Esa es la prueba real.

---

### Fase 4 — API Gateway, seguridad avanzada y hardening (2 semanas)

- [ ] **API Gateway**: Kong, Traefik o uno propio en NestJS
  - Rate limiting, validación de JWT en el borde, routing
- [ ] Seguridad entre servicios:
  - **mTLS** o al menos tokens de servicio (client credentials flow)
  - Red interna de Docker: los servicios NO exponen puertos al host, solo el gateway
- [ ] Gestión de secretos: variables de entorno → **Vault de HashiCorp** (en contenedor) o secrets de Docker/K8s
- [ ] **Auditoría inmutable**: servicio que consume TODOS los eventos y los persiste append-only (requisito bancario clásico)
- [ ] Cifrado de datos sensibles en reposo (PII de clientes), hashing correcto donde aplique
- [ ] Escaneo de imágenes (Trivy) y análisis estático en CI

---

### Fase 5 — Observabilidad y calidad operativa (2 semanas)

- [ ] **Logs estructurados** (JSON) centralizados con Loki o ELK
- [ ] **Métricas** con Prometheus + dashboards en Grafana (latencia, lag de consumidores Kafka, saldos agregados)
- [ ] **Tracing distribuido** con OpenTelemetry + Jaeger — imprescindible para seguir una transferencia a través de 4 servicios
- [ ] Health checks (`/health`, `/ready`) en todos los servicios
- [ ] CI/CD con GitHub Actions/GitLab CI: build de imágenes, tests con Testcontainers, push a registry local (Harbor o registry:2 en contenedor)

---

### Fase 6 — Kubernetes y resiliencia (2-3 semanas, opcional pero muy valiosa)

- [ ] Migrar de Compose a **k3s o kind** (Kubernetes local, sin cloud)
- [ ] Helm charts o Kustomize por servicio
- [ ] Probes, resource limits, HPA (autoescalado horizontal)
- [ ] Circuit breakers (Resilience4j en Java) y timeouts en todas las llamadas
- [ ] **Chaos testing** casero: matar pods aleatoriamente y verificar consistencia del ledger
- [ ] Pruebas de carga con k6 o Gatling (¿cuántas transferencias/segundo aguanta?)

---

## 🗺️ Orden de servicios sugerido

```
1. Keycloak (auth)          → sin esto, nada es seguro
2. Customer Service          → el más simple, sirve para validar el setup
3. Account Service           → introduce consumo de eventos
4. Ledger Service            → el más complejo (event sourcing + outbox)
5. Transfer Service          → sagas y compensaciones
6. Fraud Service (Python)    → reglas de negocio async
7. Notification Service      → el más fácil, puro consumidor
8. Audit Service             → consume todo, append-only
```

## 📚 Conceptos clave que dominarás (para estudiar en paralelo)

| Concepto | Dónde lo aplicas |
|---|---|
| Event Sourcing + CQRS | Ledger |
| Transactional Outbox / CDC | Todos los productores |
| Saga pattern (coreografía/orquestación) | Transferencias |
| Idempotencia y exactly-once semántico | Ledger, Payments |
| Doble partida contable | Ledger |
| OAuth2 / OIDC / JWT / PKCE | Auth en todo el sistema |
| Backpressure, DLQ, consumer groups | Kafka en general |

---

## ⏱️ Estimación total

Trabajando en tiempo libre: **4-6 meses** para las fases 0-5. Mi consejo: **no intentes hacerlo perfecto desde el inicio**. En la Fase 1-2 puedes usar RabbitMQ y saltarte el outbox pattern; refactorizar hacia Kafka + outbox después es en sí mismo un ejercicio valiosísimo que replica lo que pasa en empresas reales.

¿Quieres que profundicemos en alguna fase? Puedo ayudarte con el `docker-compose.yml` inicial (Kafka + Keycloak + Postgres), el diseño del esquema del ledger con doble partida, o la estructura del primer microservicio.
