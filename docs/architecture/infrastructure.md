# Infraestructura local (Phase 1)

## Objetivo

Levantar un entorno de desarrollo autocontenido con Docker Compose: bases de datos por servicio, broker de eventos y stack de observabilidad. Sin cloud ni serverless.

## Compose root

Archivo: [`compose.yaml`](../../compose.yaml)

```bash
# Linux / macOS / WSL
make up
make status
make down

# Windows PowerShell
.\scripts\compose.ps1 -Command up
.\scripts\compose.ps1 -Command status
.\scripts\compose.ps1 -Command down

# npm (cross-platform)
npm run up
npm run status
npm run down
```

## Servicios de plataforma

| Servicio | Imagen | Puertos host | Rol |
|----------|--------|--------------|-----|
| PostgreSQL | `postgres:16.3-alpine` | 5432 | SQL multi-DB |
| Redpanda | `redpandadata/redpanda:v24.1.1` | 19092, 19644, 18081, 18082 | Event broker (Kafka API) |
| Redpanda Console | `redpandadata/console:v2.6.0` | 8080 | UI topics/mensajes |
| Prometheus | `prom/prometheus:v2.53.0` | 9090 | Métricas |
| Loki | `grafana/loki:2.9.2` | 3100 | Logs |
| Tempo | `grafana/tempo:2.4.1` | 3200, 4317, 4318 | Trazas |
| Grafana | `grafana/grafana:10.4.0` | 3000 | Dashboards |
| OTel Collector | `otel/opentelemetry-collector-contrib:0.102.1` | 8889 | Telemetría |

## Bases de datos

Un solo servidor PostgreSQL con **una BD por bounded context** (nunca compartir tablas entre servicios):

| Base | Servicio dueño |
|------|----------------|
| `auth_db` | auth-service |
| `customer_db` | customer-service |
| `account_db` | account-service |
| `ledger_db` | ledger-service |
| `payment_db` | payment-service (fase 6) |
| `risk_db` | risk-service (fase 7) |
| `notification_db` | notification-service (fase 7) |
| `query_db` | query-service (fase 7) |

Init: [`platform/compose/postgres/init.sql`](../../platform/compose/postgres/init.sql)

Credenciales dev: `postgres` / `postgres`

## Redpanda

- Protocolo Kafka sin Zookeeper
- Auto-create topics habilitado en dev
- Brokers:
  - Interno (Docker): `redpanda:9092`
  - Host: `localhost:19092`
- Topics usados hoy:
  - `banking.customer.events`
  - `banking.account.events`
  - `banking.ledger.events`
- Topics previstos: `banking.payment.events`, `banking.risk.events`, …

UI: http://localhost:8080

## Observabilidad (base)

Config en `platform/observability/`:

| Pieza | URL | Notas |
|-------|-----|-------|
| Grafana | http://localhost:3000 | admin / admin |
| Prometheus | http://localhost:9090 | scrape config en `prometheus.yml` |
| Loki | http://localhost:3100 | logs |
| Tempo | http://localhost:3200 | traces OTLP 4317/4318 |
| OTel Collector | :8889 | pipeline hacia Prometheus/Loki/Tempo |

La instrumentación completa de servicios de negocio es **fase 8**.

## Redes Docker

| Red | Uso |
|-----|-----|
| `banking_public` | Exposición a host (herramientas y APIs en dev) |
| `banking_internal` | Comunicación servicio ↔ infra |

## Servicios de aplicación en Compose

| Servicio | Puerto | Imagen / build |
|----------|--------|----------------|
| `ledger-service` | 3004 | build desde `apps/ledger-service/Dockerfile` |

Auth, customer y account se ejecutan hoy en local (NestJS) o se pueden añadir al compose más adelante.

### Dependencias típicas de un servicio

```yaml
depends_on:
  postgres:
    condition: service_healthy
  redpanda:
    condition: service_healthy
```

## Health checks

| Componente | Check |
|------------|-------|
| PostgreSQL | `pg_isready -U postgres` |
| Redpanda | `rpk cluster info` |
| Prometheus | `/-/healthy` |
| Loki / Tempo | `/ready` |
| ledger-service | `GET /api/health` |

## Verificación rápida

```bash
# PostgreSQL
docker compose exec postgres psql -U postgres -c "\l"

# Redpanda
curl http://localhost:19644/v1/status/ready

# Redpanda Console
curl http://localhost:8080/api/health

# Prometheus / Grafana / Loki / Tempo
curl http://localhost:9090/-/healthy
curl http://localhost:3000/api/health
curl http://localhost:3100/ready
curl http://localhost:3200/ready

# Ledger
curl http://localhost:3004/api/health
```

## Volúmenes persistentes

- `postgres_data`
- `redpanda_data`
- `prometheus_data`
- `loki_data`
- `tempo_data`
- `grafana_data`

`make down` / `compose.ps1 down` elimina contenedores; los volúmenes pueden conservarse según flags del script.

## Convenciones

- Imágenes con tags fijos (nunca `latest` en prod)
- Secretos fuera de Git (dev usa defaults documentados)
- Un contenedor = un proceso
- Usuario no-root en imágenes de aplicación
- Config vía variables de entorno

## Próximos pasos de plataforma

| Fase | Qué |
|------|-----|
| 6 | Añadir `payment-service` al compose |
| 7 | risk / notification / query |
| 8 | OTel en todos los servicios + dashboards de negocio |
| 9 | Hardening, backups, rate limiting |
| 10 | K3s local + CI/CD |
