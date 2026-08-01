# AGENTS.md — Core Bancario Event-Driven

Proyecto personal: core bancario con reglas de negocio reales, arquitectura orientada a eventos, microservicios, y autenticación propia. Todo en contenedores, sin serverless ni proveedores cloud.

## Roadmap (orden de construcción)

| Fase | Qué | Lenguaje | Resultado verificable |
|------|-----|----------|-----------------------|
| 0 | Diseño: bounded contexts, catálogo de eventos, ADR, modelo de amenazas | — | Diagrama C4 + catálogo AsyncAPI |
| 1 | `docker-compose.yml` base: PostgreSQL, Redpanda, observabilidad | — | `docker compose up` levanta todo sano |
| 2 | Auth service: JWT RS256 + Argon2id, refresh tokens, roles (hexagonal) | TypeScript/NestJS | Login funcional, endpoints protegidos |
| 3 | Customer service: CRUD clientes, KYC, eventos a Redpanda (hexagonal) | TypeScript/NestJS | Cliente bancario vinculado a userId, `CustomerRegistered` en Redpanda |
| 4 | Account service: apertura cuentas, límites, estados (hexagonal) | TypeScript/NestJS | Crear cuenta vinculada a cliente, emitir `AccountOpened` |
| 5 | Ledger service: partida doble, outbox, idempotencia, optimistic locking | Java/Spring Boot | Depósito y retiro con eventos publicados |
| 6 | Payment/Transfer service + Saga | TypeScript o Java | Transferencia entre dos cuentas con rollback |
| 7 | Risk service (reglas), Notification service, Query service (CQRS proyecciones) | Python/FastAPI + TS | Notificaciones y vistas de movimientos |
| 8 | Observabilidad: OpenTelemetry, Grafana, Loki, Tempo, métricas de negocio | — | Dashboard con trazas, lag de consumidores, saldo contable = 0 |
| 9 | Hardening: STRIDE, rate limiting, escaneo de imágenes, cifrado en reposo, backups | — | Pruebas de abuso + restauración de backup |
| 10 | Kubernetes local (K3s): NetworkPolicies, probes, rolling updates, CI/CD autocontenido | — | Destruir cluster y levantarlo con un comando |

MVP base completado: fases 0–6 (auth → customer → account → ledger → payment).  
Siguiente: fase 7 risk-service + notification-service + query-service.  
Estado documentado en [`docs/phases/00-05-mvp-status.md`](docs/phases/00-05-mvp-status.md).

## Stack y decisiones de arquitectura

- **Lenguajes**: TypeScript/NestJS para servicios de soporte y gateway. Java/Spring Boot para el ledger (transaccionalidad, BigDecimal). Python/FastAPI para risk/reporting.
- **Runtime**: Bun o Node.js según el servicio. Java 11+. Python 3.11+.
- **Event broker**: Redpanda (protocolo Kafka, sin Zookeeper, más ligero para desarrollo local).
- **BD**: PostgreSQL por servicio (nunca compartir BD entre servicios). Redis solo si surge necesidad demostrable.
- **Auth**: Custom JWT RS256 + Argon2id (sin servicios externos). Flujo: login → access token corto + refresh token con rotación. Middleware en gateway valida firma, issuer, audience, expiración y scopes.
- **Contratos**: JSON Schema para eventos (basta para MVP). Si se necesita evolución fuerte más adelante, migrar a Avro/Protobuf con Schema Registry.
- **Seguridad servicio-servicio**: Client Credentials o token interno compartido entre servicios vía red Docker aislada. mTLS en fase avanzada.
- **API Gateway**: Traefik o custom NestJS. Rate limiting y validación JWT en el borde.
- **Observabilidad**: OpenTelemetry (trazas), Prometheus + Grafana (métricas), Loki (logs), Tempo (trazas). Logs en JSON estructurado.
- **CI/CD**: Gitea + Woodpecker CI autocontenidos. Build multi-stage, imágenes mínimas, usuario no-root.
- **Arquitectura interna de servicios**: Hexagonal (Ports & Adapters) obligatoria. Ver [`docs/architecture/hexagonal-architecture.md`](docs/architecture/hexagonal-architecture.md) y [`docs/adr/007-hexagonal-architecture.md`](docs/adr/007-hexagonal-architecture.md).

### Estructura hexagonal obligatoria por servicio

Todo servicio debe seguir esta estructura:

```
service/src/
├── domain/               # Cero dependencias de frameworks
│   ├── entities/          # Entidades puras (static create/reconstruct)
│   ├── value-objects/     # VOs inmutables con validación
│   ├── ports/             # Interfaces (contratos) + tokens DI
│   ├── events/            # Eventos de dominio (puros)
│   └── exceptions/        # Errores de dominio tipados
├── application/           # Solo depende de domain/
│   ├── use-cases/         # Un caso de uso por clase
│   └── dto/               # DTOs de entrada/salida
├── infrastructure/        # Implementa domain/ports/
│   ├── persistence/       # ORM entities, mappers, repos
│   ├── messaging/         # Kafka/Redpanda publishers
│   └── config/            # NestJS config (registerAs)
└── presentation/          # Usa application/use-cases
    ├── controllers/
    ├── guards/
    └── strategies/
```

**Reglas**:
- `domain/` nunca importa de capas superiores
- `application/` solo importa de `domain/`
- DI por tokens de símbolo (`@Inject(USER_REPOSITORY)`)
- Entidades ORM con sufijo `.orm-entity.ts`, mapeadas por `Mapper.toDomain()` / `Mapper.toPersistence()`
- Eventos de dominio puros en `domain/events/`, publicados por `KafkaEventPublisher` en `infrastructure/messaging/`

## Reglas de negocio que todo agente debe conocer

1. **Partida doble obligatoria**: toda operación genera al menos un débito y un crédito. Σ débitos = Σ créditos siempre.
2. **Dinero jamás en float/double**: usar enteros (centavos) + moneda, o BigDecimal en Java. Guardar siempre la moneda junto al monto.
3. **Asientos inmutables**: una transacción publicada NO se modifica. Los errores se corrigen con reversiones (asientos contrarios).
4. **Idempotencia obligatoria**: cada comando financiero debe aceptar `Idempotency-Key`. Los consumidores de eventos deben registrar `event_id` procesados y no ejecutar dos veces.
5. **Transactional Outbox**: nunca publicar un evento sin haberlo guardado en la misma transacción de BD. Worker de outbox propio (no Debezium al inicio).
6. **Cada servicio dueño de su BD**: no leer tablas de otro servicio, no compartir entidades ORM, no transacciones distribuidas, no acoplar modelo interno a esquemas de eventos ajenos.
7. **Solo ledger-service toca saldos**: ni payment ni account modifican saldos directamente.
8. **Eventos llevan envelope estándar**: eventId, eventType, eventVersion, occurredAt, producer, correlationId, causationId, subjectId, data. No incluir PII innecesaria en eventos.

## Estructura del monorepo (plan)

```
banking/
├── apps/
│   ├── auth-service/          # NestJS, JWT RS256 + Argon2id
│   ├── customer-service/      # NestJS o Spring Boot
│   ├── account-service/       # NestJS o Spring Boot
│   ├── ledger-service/        # Spring Boot (Java) — el más crítico
│   ├── payment-service/       # NestJS, orquestador de sagas
│   ├── risk-service/          # FastAPI (Python)
│   ├── notification-service/  # NestJS
│   ├── query-service/         # NestJS, proyecciones CQRS
│   ├── api-gateway/           # NestJS + rate limiting
│   └── web-app/               # React (futuro)
├── contracts/
│   ├── asyncapi/              # Catálogo de eventos
│   ├── openapi/               # APIs REST
│   └── json-schema/           # Schemas de eventos
├── platform/
│   ├── compose/               # docker-compose.yml
│   ├── kubernetes/            # Manifiestos K3s (fase 9)
│   ├── observability/         # Grafana, Prometheus, Loki, Tempo
│   └── ci/                    # Woodpecker pipelines
├── libraries/
│   ├── ts-event-envelope/     # Envelope + middlewares TypeScript
│   ├── java-observability/    # OpenTelemetry para Spring Boot
│   └── py-event-envelope/     # Envelope para Python
├── tests/
│   ├── contract/              # AsyncAPI/OpenAPI contract tests
│   ├── end-to-end/            # Flujos completos
│   └── resilience/            # Chaos testing
├── docs/
│   ├── architecture/          # Diagramas C4, bounded contexts
│   ├── adr/                   # Architecture Decision Records
│   ├── threat-model/          # STRIDE
│   └── events/                # Catálogo de eventos detallado
├── compose.yaml
├── Makefile
└── README.md
```

## Comandos de desarrollo

- `make up` — levanta toda la infraestructura con Docker Compose
- `make down` — detiene y limpia
- `make test` — ejecuta todas las pruebas
- `make test-app name=ledger-service` — pruebas de un servicio específico
- `make migrate name=ledger-service` — migraciones de BD de un servicio
- `make seed` — carga datos de prueba reproducibles
- `make lint` — ESLint + Checkstyle + Ruff según lenguaje
- `make build` — build multi-stage de todas las imágenes

## Convenciones

- Conventional Commits.
- Cada servicio expone `/health` y `/ready`.
- Variables de entorno para configuración externa (nunca hardcodear en imágenes).
- Secretos gestionados con OpenBao o Docker secrets (nunca en Git ni en imágenes).
- Imágenes con hashes fijos, nunca `latest`.
- Usuario no root en todos los contenedores.

## Errores comunes que evitar (verificados contra las propuestas)

1. Crear demasiados microservicios desde el inicio — empezar con 3-4 máximo.
2. Compartir BD entre servicios.
3. Actualizar saldos desde múltiples servicios.
4. Usar float/double para dinero.
5. Confiar en entrega exactly-once sin diseñar consumidores idempotentes.
6. Publicar eventos sin outbox (riesgo de inconsistencia).
7. Permitir modificar entradas contables ya publicadas.
8. Incluir PII en eventos.
9. Usar el broker para consultas síncronas (es para eventos, no para request-response).
10. Aplicar event sourcing completo al ledger al inicio — basta con tabla de transacciones + outbox.
11. Desplegar Kubernetes antes de tener un MVP funcional en Compose.
12. Implementar auth propia con contraseñas en BD (usar Argon2id con salts únicos, nunca hashes débiles).
13. Compartir librerías con modelos de dominio entre servicios.
14. Tratar DLQ como solución permanente — los eventos muertos requieren intervención.
15. No probar restauración de backups.
