# Banking Core — Event-Driven

Core bancario personal con microservicios, arquitectura hexagonal, eventos y autenticación propia. Todo en contenedores locales (sin cloud ni serverless).

## Estado del roadmap

| Fase | Qué | Estado |
|------|-----|--------|
| 0 | Diseño: C4, BC, ADRs, catálogo eventos, STRIDE | ✅ |
| 1 | Compose: PostgreSQL, Redpanda, observabilidad | ✅ |
| 2 | auth-service (NestJS, JWT RS256 + Argon2id) | ✅ |
| 3 | customer-service (NestJS, KYC + eventos) | ✅ |
| 4 | account-service (NestJS, cuentas + eventos) | ✅ |
| 5 | ledger-service (Java/Spring, partida doble + outbox) | ✅ |
| 6 | payment-service + Saga | ✅ |
| 7 | risk-service ✅ / notification-service ✅ / query-service ✅ / api-gateway ✅ | ✅ |
| 8 | Observabilidad de negocio (OTel end-to-end) | ⏳ |
| 9 | Hardening | ⏳ |
| 10 | K3s local + CI/CD | ⏳ |

Detalle: [`docs/phases/00-05-mvp-status.md`](docs/phases/00-05-mvp-status.md)

## Stack

| Capa | Tecnología |
|------|------------|
| Servicios soporte | TypeScript / NestJS |
| Ledger | Java 21 / Spring Boot |
| Broker | Redpanda (Kafka API) |
| BD | PostgreSQL 16 (una DB por servicio) |
| Auth | JWT RS256 + Argon2id |
| Contratos | JSON Schema + AsyncAPI |
| Observabilidad base | Prometheus, Grafana, Loki, Tempo, OTel Collector |
| Arquitectura interna | Hexagonal (obligatoria) |

## Arranque rápido

### Infraestructura

```bash
# Linux / macOS / WSL
make up && make status

# Windows PowerShell
.\scripts\compose.ps1 -Command up
.\scripts\compose.ps1 -Command status

# npm
npm run up
```

Los 9 servicios (auth, customer, account, ledger, payment, risk, notification,
query, api-gateway) están en `compose.yaml` — `-Command up` los levanta a todos.

```bash
docker compose -f compose.yaml up -d ledger-service
curl http://localhost:3004/api/health
```

### Tests y datos de demo

```bash
make test   # 9 suites unitarias + E2E (tests/end-to-end/) + contrato (tests/contract/)
make seed   # deja el stack con un cliente demo, 2 cuentas EUR y una transferencia completada
```

`make test`/`make seed` requieren el stack levantado (`make up`). Ver
`AGENTS.md` para el detalle de cada target.

### Desarrollo local con hot-reload (opcional)

Para iterar rápido en un servicio puntual sin rebuild de imagen, se puede correr
localmente en paralelo (parar su contenedor primero para no chocar puertos):

```bash
# auth — puerto 3001 (requiere generar las claves RS256 una sola vez)
cd apps/auth-service
npm install && npm run keys:generate && npm run migration:run && npm run start:dev
```

`npm run keys:generate` debe correrse antes de `docker compose build` incluso si
no se usa este modo local — el Dockerfile de auth-service copia
`apps/auth-service/keys/` a la imagen, y api-gateway monta la clave pública para
validar JWT.

## URLs de desarrollo

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| Grafana | http://localhost:3000 | admin / admin |
| Prometheus | http://localhost:9090 | — |
| Redpanda Console | http://localhost:8080 | — |
| PostgreSQL | localhost:5432 | postgres / postgres |
| auth-service | http://localhost:3001 | — |
| customer-service | http://localhost:3002 | — |
| account-service | http://localhost:3003 | — |
| ledger-service | http://localhost:3004 | — |
| payment-service | http://localhost:3005 | — |
| risk-service | http://localhost:3006 | — |
| notification-service | http://localhost:3007 | — |
| query-service | http://localhost:3008 | — |
| api-gateway | http://localhost:3009 | — |

## Documentación

### Arquitectura

| Doc | Contenido |
|-----|-----------|
| [C4 Context](docs/architecture/c4-context.md) | Sistema en contexto |
| [C4 Containers](docs/architecture/c4-containers.md) | Contenedores / servicios |
| [Bounded contexts](docs/architecture/bounded-contexts.md) | Dominios y ownership |
| [Hexagonal](docs/architecture/hexagonal-architecture.md) | Estándar de capas |
| [Infrastructure](docs/architecture/infrastructure.md) | Compose, Redpanda, obs |
| [Auth service](docs/architecture/auth-service.md) | Fase 2 |
| [Customer service](docs/architecture/customer-service.md) | Fase 3 |
| [Account service](docs/architecture/account-service.md) | Fase 4 |
| [Ledger service](docs/architecture/ledger-service.md) | Fase 5 |
| [Payment service](docs/architecture/payment-service.md) | Fase 6 |
| [Risk service](docs/architecture/risk-service.md) | Fase 7 |
| [Notification service](docs/architecture/notification-service.md) | Fase 7 |
| [Query service](docs/architecture/query-service.md) | Fase 7 |
| [API Gateway](docs/architecture/api-gateway.md) | Fase 7 |

### Decisiones (ADR)

| ADR | Tema |
|-----|------|
| [001](docs/adr/001-redpanda.md) | Redpanda |
| [002](docs/adr/002-monorepo.md) | Monorepo |
| [003](docs/adr/003-json-schema.md) | JSON Schema |
| [004](docs/adr/004-outbox.md) | Outbox |
| [005](docs/adr/005-auth-custom.md) | Auth custom |
| [006](docs/adr/006-saga.md) | Saga orquestada |
| [007](docs/adr/007-hexagonal-architecture.md) | Hexagonal |

### Otros

- [Catálogo de eventos](docs/events/catalog.md)
- [Threat model STRIDE](docs/threat-model/stride-transfer-flow.md)
- [Estado fases 0–5](docs/phases/00-05-mvp-status.md)
- [AGENTS.md](AGENTS.md) — reglas para agentes / roadmap

## Ejemplo: depósito en ledger

```bash
# 1. Abrir cuenta en account-service → ledger-service crea la cuenta contable (LIABILITY)
#    automáticamente al consumir el evento AccountOpened (no hace falta el paso manual
#    salvo que quieras probar ledger-service de forma aislada, sin account-service):
#    curl -X POST http://localhost:3004/api/ledger/accounts \
#      -H "Content-Type: application/json" \
#      -d '{"accountId":"CUST-001","accountNumber":"ES1000000001","accountType":"LIABILITY","currency":"EUR"}'

# 2. Depositar
curl -X POST http://localhost:3004/api/ledger/deposit \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: dep-demo-001" \
  -d '{"accountId":"CUST-001","amount":1000.00,"currency":"EUR","description":"Demo"}'

# 3. Balance
curl http://localhost:3004/api/ledger/accounts/CUST-001/balance

# 4. Eventos en Redpanda Console
# http://localhost:8080 → topic banking.ledger.events
```

## Reglas de negocio no negociables

1. Partida doble siempre (Σ débitos = Σ créditos)
2. Dinero nunca en float — enteros/centavos o `BigDecimal`
3. Asientos inmutables; errores → reversión
4. `Idempotency-Key` en comandos financieros
5. Transactional outbox (nunca publicar sin persistir en la misma TX)
6. Cada servicio dueño de su BD
7. Solo **ledger-service** toca saldos
8. Eventos con envelope estándar (sin PII innecesaria)

## Estructura del monorepo

```
banking/
├── apps/                 # Microservicios
│   ├── auth-service/
│   ├── customer-service/
│   ├── account-service/
│   └── ledger-service/
├── contracts/            # JSON Schema, AsyncAPI, OpenAPI
├── docs/                 # Arquitectura, ADRs, eventos, threat model
├── platform/             # Compose helpers, observability configs
├── compose.yaml
├── AGENTS.md
└── README.md
```

## Próximo paso

**Fase 7 completa** — los 8 servicios de negocio más api-gateway (borde único con
JWT + rate limiting) ya son código real. Sigue **fase 8 — observabilidad OTel
end-to-end**. Ver [`docs/ROADMAP.md`](docs/ROADMAP.md).
