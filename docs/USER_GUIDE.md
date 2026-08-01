# Guía de usuario

Cómo levantar el sistema y usar la API completa (los 9 servicios, a través del
borde único `api-gateway`). Para arquitectura interna ver `docs/architecture/`;
para el estado del roadmap ver `docs/ROADMAP.md`.

## 1. Levantar el entorno

Requiere Docker Desktop corriendo. Antes de la primera vez, generar las claves
RS256 de auth-service (se hornean en su imagen):

```powershell
cd apps/auth-service
npm install
npm run keys:generate
cd ../..
```

Levantar todo:

```powershell
.\scripts\compose.ps1 -Command up
.\scripts\compose.ps1 -Command status
```

Esto construye y arranca los 9 servicios de negocio (auth, customer, account,
ledger, payment, risk, notification, query, api-gateway) más la infraestructura
(Postgres, Redpanda, Grafana/Prometheus/Loki/Tempo). Tarda unos minutos la
primera vez (build de imágenes). Verificar que todo esté `healthy`:

```powershell
docker compose -f compose.yaml ps
```

**Todo el tráfico de negocio pasa por `api-gateway` en `http://localhost:3009`**
— es el único borde: valida JWT y aplica rate limiting antes de reenviar al
servicio interno correspondiente. No hace falta (ni conviene) pegarle
directo a los puertos 3001-3008 salvo para depurar un servicio puntual.

## 2. El archivo de peticiones (`requests/banking.http`)

`requests/banking.http` tiene la colección completa de peticiones, en formato
[REST Client de VS Code](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
(instalar esa extensión, abrir el archivo, click en "Send Request" arriba de
cada bloque `###`). Las secciones 1 a 7 están **encadenadas**: cada petición
importante lleva `# @name algo` y las siguientes reutilizan su respuesta
(`{{login.response.body.$.accessToken}}`, etc.), así que ejecutando de arriba
hacia abajo una sola vez ya se recorre el flujo completo sin copiar/pegar IDs
a mano.

Si usás el HTTP Client de JetBrains (IntelliJ/WebStorm) en vez de VS Code, la
sintaxis de método/URL/headers/body es compatible, pero el encadenado de
variables usa otra sintaxis (`client.global.set(...)`) — vas a tener que
adaptar esas líneas o pegar los valores a mano entre pasos.

## 3. Autenticación

Todo excepto registro/login/refresh y los `/health` requiere:

```
Authorization: Bearer <accessToken>
```

Flujo:
1. `POST /api/auth/register` — público. `{email, password, firstName, lastName}`
   → `{userId, email, roles}`. La contraseña exige mínimo 12 caracteres con
   mayúscula, minúscula, número y símbolo.
2. `POST /api/auth/login` — público. `{email, password}` →
   `{accessToken, refreshToken, expiresIn, tokenType}`. El `accessToken` dura
   15 minutos por defecto.
3. `POST /api/auth/refresh` — el `refreshToken` va en el **body**, no en el
   header (por eso el gateway lo trata como ruta pública: no hay
   `Authorization: Bearer` que validar ahí, auth-service valida el refresh
   token él mismo).

## 4. Flujo de negocio de punta a punta

Este es el recorrido que valida el sistema completo (auth → customer → account
→ ledger → payment → risk → query → notification), tal cual está armado en
`requests/banking.http`:

1. **Registrar** un usuario y **loguearse** (sección 1).
2. **Crear un cliente** en customer-service con el `userId` del registro
   (sección 2). Queda en `kycStatus: PENDING`.
3. **Verificar KYC** (`POST /customers/:id/verify-kyc`). Sin esto,
   account-service **rechaza** la apertura de cuentas — y como la verificación
   se propaga por Kafka (evento `CustomerVerified`), puede hacer falta
   reintentar la apertura de cuenta un par de veces con un segundo de espera
   entre intentos si da error justo después de verificar el KYC.
4. **Abrir 2 cuentas** del mismo cliente (sección 3) — una de origen, otra de
   destino. Nacen con saldo 0.
5. **Depositar fondos** en la cuenta origen vía ledger-service directo
   (sección 4) — es la única forma de meter dinero "externo" en un ledger de
   partida doble (no hay cuenta origen para un depósito). **Ojo**: acá el
   monto es decimal (`500.00` = 500 EUR), a diferencia del paso siguiente.
6. **Crear la transferencia** en payment-service (sección 5) — acá el monto va
   en **centavos enteros** (`10000` = 100.00 EUR). Dispara una saga asíncrona:
   `CREATED → VALIDATING → RISK_REVIEW → AUTHORIZED → POSTING → COMPLETED`.
   Límites por defecto de risk-service: **$10,000 por transacción**,
   **$50,000 acumulado por día** — superarlos termina el pago en `FAILED`.
7. **Consultar el estado del pago** (`GET /payments/:id`) hasta ver
   `COMPLETED` — normalmente un par de segundos (evaluación de riesgo +
   posting en el ledger).
8. **Consultar las proyecciones de solo lectura** en query-service (sección 6,
   bajo `/api/query/*`) y las **notificaciones** generadas (sección 7). Ambas
   son eventualmente consistentes — si se consultan inmediatamente después del
   paso 7 puede que todavía no reflejen el último estado; reintentar si hace
   falta.

## 5. Cosas a tener en cuenta

- **`/api/query/*` es un namespace separado, no un alias**: `GET
  /api/accounts/:id` (account-service, estado autoritativo inmediato) y `GET
  /api/query/accounts/:id` (query-service, proyección eventualmente
  consistente) devuelven cosas distintas a propósito — ver
  `docs/architecture/api-gateway.md`.
- **`Idempotency-Key` obligatorio en comandos financieros** (ledger y
  payments): mandalo como header, y en el caso de
  `POST /payments/transfer` el DTO además lo exige repetido en el body con el
  mismo valor.
- **risk-service no tiene API pública** — solo consume/produce eventos Kafka,
  no está expuesto por el gateway.
- **Health checks son públicos, pero no todos son alcanzables a través del
  gateway**: el gateway reenvía cada prefijo tal cual (`/api/auth/*` →
  `auth-service:/api/auth/*`), y el `HealthController` de cada servicio vive
  en un `/api/health` "plano", no anidado bajo su propio prefijo de recurso.
  `{{gateway}}/api/customers/health`, por ejemplo, no llega al healthcheck: cae
  en la ruta `@Get(':id')` de `CustomersController` con `"health"` como id
  (401, no 404) — verificado a mano contra el stack real, ver la sección 0 de
  `requests/banking.http`. Para chequear un servicio puntual, pegarle directo a
  su puerto (`http://localhost:3001/api/health`, etc.) — que es exactamente lo
  que ya hace el healthcheck de cada contenedor en `compose.yaml`. La única
  excepción que sí resuelve bien a través del gateway es query-service
  (`/api/query/health`), porque su rewrite `/api/query` → `/api` lo redirige al
  `/api/health` real. ledger-service usa `/api/health` y `/api/ready` (sin el
  `/health/ready` anidado que usan los NestJS); risk-service expone `/health`
  sin prefijo `/api` y no pasa por el gateway (sin API pública).
- Para el detalle completo de request/response de cada endpoint (campos,
  validaciones, catálogo de eventos), ver `docs/architecture/*.md` por
  servicio.

## 6. Observabilidad

- Grafana: `http://localhost:3000` (admin/admin)
- Redpanda Console (topics/mensajes Kafka): `http://localhost:8080`
- Postgres: `localhost:5432` (postgres/postgres) — una base por servicio
  (`auth_db`, `customer_db`, etc.)

## 7. Problemas conocidos (no bloqueantes)

- `account-service` y `customer-service` tienen un guard JWT propio con un
  fallback inseguro si se les pega directo (bypaseando el gateway) — ver
  `CLAUDE.md`. No afecta el uso normal a través de `api-gateway`.
- Sin autorización granular por scopes en el gateway todavía (solo valida que
  el JWT sea válido) — ver `docs/architecture/api-gateway.md`.
