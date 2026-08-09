# API Gateway

## Responsabilidades

- Borde único de la plataforma: valida JWT RS256 y aplica rate limiting antes de
  reenviar a los servicios internos
- Enruta cada prefijo de path al servicio correspondiente (proxy reverso)
- No persiste nada, no consume ni emite eventos Kafka — es puro borde de
  infraestructura, sin dominio de negocio propio

## Tecnologías

- TypeScript / NestJS (solo para bootstrap, config y health — el proxy/auth/rate
  limit corren como middleware Express, no como Guards/Controllers de Nest, porque
  deben interceptar rutas que no pasan por el router de Nest)
- `http-proxy-middleware` para el reenvío (librería madura en vez de reinventar
  manejo de body/headers/streaming por método)
- `jsonwebtoken` para verificación RS256 stateless (sin `auth_db`, sin llamar a
  auth-service en cada request — regla de una BD por servicio + ADR-005)
- `express-rate-limit` para rate limiting básico
- Arquitectura hexagonal deliberadamente delgada (Ports & Adapters): sin entidades
  de dominio, porque no hay lógica de negocio que modelar

## Arquitectura hexagonal

```
apps/api-gateway/src/
├── domain/
│   ├── ports/            # TokenVerifierPort
│   └── errors/            # InvalidTokenError
├── application/
│   └── services/          # isPublicRoute (función pura)
├── infrastructure/
│   ├── config/            # app, jwt, rate-limit, routes
│   ├── auth/               # Rs256TokenVerifier, jwt-auth.middleware
│   ├── rate-limit/         # rate-limit.middleware
│   └── proxy/              # proxy.middleware (uno por entrada de routes.config)
└── presentation/
    └── controllers/        # HealthController (sin BD)
```

`main.ts` monta el pipeline en orden: helmet + compression + cors →
rate-limit → jwt-auth → proxy por prefijo. El healthcheck propio
(`GET /api/health`) es el único endpoint servido por el router de Nest.

## Validación JWT

- Igual que `apps/auth-service/src/presentation/strategies/jwt.strategy.ts`, pero
  sin consultar `auth_db`: solo verifica firma RS256, issuer, audience y
  expiración con la clave pública de auth-service.
- **Fail-closed**: si `JWT_PUBLIC_KEY_PATH` no resuelve a un archivo legible, el
  bootstrap lanza y el proceso no arranca. Nunca cae a aceptar un token sin
  verificar.
- El middleware reenvía la request tal cual (con su header `Authorization`
  original) al servicio destino — no inventa un contrato de headers internos
  (`X-User-*`) que ningún servicio consume hoy. Los servicios ya hacen su propia
  verificación aguas abajo (defensa en profundidad).

### Rutas públicas (sin JWT)

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`
  (el refresh token viaja en el body, no en el header — lo valida auth-service)
- Cualquier ruta que termine en `/health` o `/ready` (match genérico, no una
  lista por servicio)

Todo lo demás exige `Authorization: Bearer <token>` válido.

**Límite conocido (verificado 2026-08-01)**: la regla de arriba exime del JWT a
rutas que *terminan* en `/health`, pero como el gateway reenvía cada prefijo
completo tal cual (`/api/customers/health` → `customer-service:/api/customers/
health`) y el `HealthController` de cada servicio vive en un `/api/health`
plano (no anidado bajo su propio prefijo de recurso), esas rutas de health
"proxied" no llegan a ningún healthcheck real — caen en la ruta `@Get(':id')`
del controller de negocio correspondiente, con `"health"` interpretado como id
(401 o 404 según si esa ruta tiene guard). La única excepción es query-service,
donde el `pathRewrite` (`/api/query` → `/api`) sí termina apuntando a su
`/api/health` real. Para chequear la salud de un servicio hay que pegarle
directo a su puerto — que es lo que ya hace el healthcheck de cada contenedor
en `compose.yaml`. No es un problema de seguridad (nada se expone de más), pero
sí es un routing gap sin resolver — candidato a un `pathRewrite` por servicio
similar al de query-service, o a mover cada `HealthController` bajo el prefijo
de su propio recurso.

## Tabla de enrutamiento

| Prefijo público | Servicio destino | Notas |
|---|---|---|
| `/api/auth/*` | auth-service | red interna Docker (`auth-service:3001`) |
| `/api/customers/*` | customer-service | red interna Docker (`customer-service:3002`) |
| `/api/accounts/*` | account-service | red interna Docker (`account-service:3003`) — escritura/estado autoritativo |
| `/api/ledger/*` | ledger-service | red interna Docker (`ledger-service:3004`) |
| `/api/payments/*` | payment-service | red interna Docker (`payment-service:3005`) — escritura/estado autoritativo |
| `/api/notifications/*` | notification-service | red interna Docker (`notification-service:3007`) |
| `/api/query/*` → reescrito a `/api/*` | query-service | red interna Docker (`query-service:3008`) — proyecciones CQRS, eventualmente consistentes |

`risk-service` **no se expone**: no tiene API HTTP pública, es puramente
consumidor/productor Kafka (`apps/risk-service/src/main.py` solo registra su
propio `health_router`, sin rutas de negocio).

### Decisión: `/api/query/*` como namespace separado

`GET /api/accounts/:id` existe tanto en account-service (estado autoritativo,
inmediato) como en query-service (proyección `AccountView`, eventualmente
consistente) — igual con `GET /api/payments/:id` en payment-service vs
query-service. Justo después de escribir, un cliente quiere el estado
autoritativo sin esperar la propagación por Kafka, así que los endpoints
singulares de escritura siempre ganan el prefijo compartido. Las proyecciones de
query-service se exponen aparte, sin ambigüedad, bajo `/api/query/*`.

## Rate limiting

Básico, por IP, vía `express-rate-limit`: `RATE_LIMIT_WINDOW_MS` (default 60000)
y `RATE_LIMIT_MAX` (default 100). Endurecer (por usuario/token, distintos límites
por endpoint) queda para fase 9 (`docs/ROADMAP.md`).

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3009` | Puerto HTTP |
| `JWT_PUBLIC_KEY_PATH` | `./keys/public.pem` | Clave pública RS256 de auth-service (montada read-only en Docker) |
| `JWT_ISSUER` | `banking-auth-service` | Issuer esperado |
| `JWT_AUDIENCE` | `banking-platform` | Audience esperada |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Ventana de rate limiting |
| `RATE_LIMIT_MAX` | `100` | Máximo de requests por ventana por IP |
| `AUTH_SERVICE_URL` | `http://localhost:3001` | Base URL de auth-service |
| `CUSTOMER_SERVICE_URL` | `http://localhost:3002` | Base URL de customer-service |
| `ACCOUNT_SERVICE_URL` | `http://localhost:3003` | Base URL de account-service |
| `LEDGER_SERVICE_URL` | `http://localhost:3004` | Base URL de ledger-service |
| `PAYMENT_SERVICE_URL` | `http://localhost:3005` | Base URL de payment-service |
| `NOTIFICATION_SERVICE_URL` | `http://localhost:3007` | Base URL de notification-service |
| `QUERY_SERVICE_URL` | `http://localhost:3008` | Base URL de query-service |

## Comandos

```bash
# Docker (recomendado) — requiere que apps/auth-service/keys/public.pem exista
# (npm run keys:generate en auth-service, ver CLAUDE.md)
docker compose -f compose.yaml build api-gateway
docker compose -f compose.yaml up -d api-gateway

# Local
cd apps/api-gateway
npm install && npm run start:dev

# Tests unitarios (sin red real: JWT con par de claves RSA generado en el test)
npm test
```

## Reglas de negocio (checklist AGENTS.md)

- [x] Validación JWT RS256 en el borde (firma, issuer, audience, expiración)
- [x] Rate limiting básico
- [x] Hexagonal (delgada, sin dominio de negocio — documentado arriba)
- [N/A] Partida doble / dinero sin float / BD propia — no aplica, no persiste nada
- [ ] Scopes por ruta (autorización fina) — diferido: no existe hoy una tabla de
  mapeo ruta→scope en el repo; inventar una ahora sería especulativo (YAGNI)
- [ ] mTLS / token interno de servicio-a-servicio (fase 9)
- [x] Tests de integración/E2E contra servicios reales — automatizados desde
  2026-08-06 (fase 9, etapa 2): `tests/end-to-end/critical-flow.e2e-spec.ts`,
  vía api-gateway contra el stack real

## Nota fuera de alcance (resuelta 2026-08-06, fase 9 etapa 1)

`account-service` y `customer-service` tenían el mismo fallback inseguro en su
guard JWT propio (caían a `jwt.decode()` sin verificar firma cuando la clave
pública no resolvía — el caso real en ambos, ya que ninguno registraba
`jwt.config.ts`). No era parte de este servicio, pero sí explotable directo
contra sus puertos mapeados al host, saltándose el gateway. Corregido en fase 9
etapa 1 (`jwt.config.ts` + guard fail-closed en ambos, ver `CLAUDE.md`) — el
gateway sigue sin depender de esos guards ni reemplazarlos, solo garantiza que
nadie sin JWT válido llegue a esos servicios *a través de él*.
