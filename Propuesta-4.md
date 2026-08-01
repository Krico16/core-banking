Este es un proyecto ambicioso y excelente para tu portafolio. Construir un **Core Bancario (Core Banking System)** desde cero con arquitectura orientada a eventos y microservicios es un gran desafío de ingeniería.

Dado que tu preferencia es **TypeScript**, te propongo un stack 100% TypeScript (NestJS) para mantener la uniformidad, pero con la flexibilidad de que si el motor contable se vuelve muy pesado, puedas reescribir ese módulo específico en Java sin afectar al resto. Todo correrá en contenedores Docker con `docker-compose` (sin dependencias de cloud).

Aquí tienes un **Roadmap estratégico y táctico** dividido en 7 fases.

---

### 🏗️ Arquitectura Propuesta (El "Destino Final")

- **API Gateway**: NestJS + GraphQL/REST (expone endpoints al cliente).
- **Servicios (Microservicios)**:
  1. **Auth Service** (autenticación local con JWT RS256).
  2. **Account Service** (gestión de cuentas, titulares, límites).
  3. **Transaction Service** (orquestación de transferencias, manejo de idempotencia).
  4. **Ledger Service** (partida doble, actualización de saldos, corazón del banco).
  5. **Audit/Event Store Service** (persiste todos los eventos para auditoría y proyecciones).
- **Broker de Eventos**: **Redpanda** (100% compatible con Kafka, pero en C++ y más ligero para contenedores, sin Zookeeper).
- **Bases de Datos**: PostgreSQL (una BD por servicio para cumplir con el aislamiento de microservicios).
- **Infraestructura**: Docker + Docker Compose (local) y manifiestos para Minikube/K3s (opcional).

---

### 📅 Roadmap de Desarrollo (7 Fases)

#### Fase 0: Cimentación y Entorno (Día 1-3)
**Objetivo**: Tener el esqueleto del monorepo y la infraestructura levantada.

- Crear un **monorepo con Turborepo** o Nx para gestionar múltiples apps TypeScript.
- Configurar `docker-compose.yml` con:
  - Redpanda (Kafka).
  - PostgreSQL (creando 3 bases de datos: `auth_db`, `account_db`, `ledger_db`).
  - Redpanda Console (para monitorear eventos visualmente).
- Crear un `shared` package dentro del monorepo para tipos comunes (DTOs, schemas de eventos en JSON/TS).
- Escribir un script Makefile o npm para levantar todo con un solo comando.

---

#### Fase 1: Seguridad y Autenticación (Día 4-7) - *Sin servicios externos*
**Objetivo**: Tener un servicio de autenticación robusto y auto-contenido.

- Implementar **Auth Service** (NestJS).
- Generar llaves RSA-256 localmente (openssl) para firmar JWTs. El `Auth Service` firma los tokens, el `Gateway` los verifica con la clave pública.
- Flujo: Registro → Hash de contraseña con **Argon2id** → Login → Devuelve Access Token (corto) + Refresh Token (HTTP-Only Cookie opcional).
- Implementar un middleware en el **API Gateway** que valide el JWT antes de enrutar a los microservicios internos.
- *Regla de negocio temprana*: Un usuario solo puede tener una cuenta corriente (validación en registro).

---

#### Fase 2: Dominio de Cuentas (Día 8-12)
**Objetivo**: CRUD de productos bancarios y cuentas, con saldo inicial.

- Crear **Account Service** con su propia BD.
- Modelos: `Account` (id, accountNumber, type, currency, balance, status, version - para control de concurrencia).
- Endpoints: Crear cuenta, consultar saldo, bloquear/desbloquear cuenta.
- **Evento**: Cuando se crea una cuenta, el servicio emite `AccountCreated` a Kafka.
- **Suscriptor**: El `Ledger Service` escucha `AccountCreated` y crea la estructura contable de esa cuenta (ej. activo/pasivo).

---

#### Fase 3: Motor de Transacciones e Idempotencia (Día 13-18)
**Objetivo**: Poder iniciar transferencias de fondos.

- Crear **Transaction Service**.
- **Regla de negocio**: Toda petición de transferencia debe incluir un `Idempotency-Key` en el header. El servicio guarda esta clave y el estado de la transacción (PENDING, COMPLETED, FAILED) en su BD para evitar duplicados.
- Endpoint: `POST /transactions/transfer` (origen, destino, monto, concepto).
- El servicio valida que las cuentas existan (vía llamada síncrona gRPC/REST al Account Service o consultando una vista cacheada).
- Emite el evento `TransactionInitiated` a Kafka.

---

#### Fase 4: Contabilidad de Partida Doble (Ledger) - *El Core* (Día 19-25)
**Objetivo**: Actualizar los saldos de manera atómica y consistente.

- Crear **Ledger Service** (el más crítico). Consume el evento `TransactionInitiated`.
- **Regla de negocio**: Implementa partida doble. Ej: Débito a cuenta origen, Crédito a cuenta destino.
- Usa **optimistic locking** (campo `version` en la tabla Account) dentro de una transacción SQL para evitar que dos débitos ocurran simultáneamente sobre el mismo saldo.
- Si el saldo es insuficiente, emite `TransactionFailed`.
- Si es exitoso, actualiza ambas cuentas y emite `BalanceUpdated` (o `TransactionCompleted`).
- **Idempotencia en Ledger**: Antes de procesar el evento, verifica en su tabla de `ProcessedEvents` si ya ejecutó ese `transactionId` para no procesarlo dos veces (consumidor idempotente).

---

#### Fase 5: Audit Trail y Proyecciones (Día 26-30)
**Objetivo**: Cumplir con la trazabilidad bancaria.

- Crear **Audit/Event Store Service**. Este servicio escucha **todos** los eventos (`AccountCreated`, `TransactionInitiated`, `BalanceUpdated`) y los persiste en una tabla `EventLog` con su payload crudo, timestamp y versión del evento.
- Implementar un **Materialized View** (o proyección) para el historial de movimientos de una cuenta, consumiendo eventos y guardando en una tabla `TransactionHistory` denormalizada para consultas rápidas (CQRS básico).

---

#### Fase 6: Resiliencia, Observabilidad y Seguridad Avanzada (Día 31-35)
**Objetivo**: Endurecer el sistema y prepararlo para "producción local".

- **Retries y Dead Letter Queue (DLQ)**: Configurar en Kafka que si el Ledger falla al procesar un evento, reintente 3 veces y luego lo envíe a un DLQ para inspección manual.
- **Health Checks**: Añadir endpoints `/health` en todos los servicios.
- **Correlation ID**: Propagar un `X-Request-ID` desde el Gateway hasta los logs de todos los microservicios para trazar una transacción completa.
- **Rate Limiting**: Añadir throttling en el Gateway (ej. 100 peticiones por minuto por usuario).
- **Renovación de tokens**: Implementar endpoint `/refresh-token` en Auth Service.

---

#### Fase 7: Empaquetado y Despliegue (Día 36-40)
**Objetivo**: Tener un artefacto desplegable en cualquier entorno sin cloud.

- Escribir `Dockerfile` para cada servicio (multistage building para reducir tamaño).
- Optimizar `docker-compose.prod.yml` con redes internas aisladas.
- Escribir un `README.md` detallado con el diagrama de eventos y comandos de inicio.
- (Opcional) Crear un script de **seeding** para cargar datos de prueba (usuarios, cuentas semilla) al iniciar los contenedores.
- Generar un `docker-compose` con **Traefik** o **Nginx** como reverse proxy interno.

---

### ⚠️ Consideraciones Técnicas Cruciales (No te saltes esto)

1.  **Consistencia vs Eventual**: Una transferencia bancaria *no puede ser eventualmente consistente* de cara al usuario. La petición HTTP debe esperar a que el Ledger confirme el débito/crédito. Para esto, usa **Saga Coreográfica + Orquestada**. El Transaction Service envía el evento, y espera la respuesta del Ledger a través de un topico de respuesta (`transaction-response`) o mediante un callback síncrono (recomiendo usar **Outbox Pattern** + polling para casos personales, pero para simplificar, el Ledger puede emitir un evento de éxito/fracaso y el Transaction Service lo consume para devolver la respuesta al cliente vía WebSocket o SSE, o simplemente bloquea la petición HTTP con un timeout y espera la respuesta de Kafka usando `KafkaConsumer` en el mismo hilo - aunque esto rompe el desacoplamiento. *Solución práctica*: Usa **gRPC bidireccional** para la comunicación Transaction ↔ Ledger, y deja los eventos solo para audit/log. O, la opción más limpia para este proyecto: El Transaction Service lanza el evento, pero el endpoint devuelve `202 Accepted` con un `transactionId`, y el cliente debe consultar el estado después (polling). Esto es más fiel a la banca real.
2.  **Manejo de Dinero**: Nunca uses `float`. Usa librerías como `decimal.js` o `bigint` (manejando céntimos/enteros).
3.  **Seguridad Interna**: Los microservicios deben comunicarse entre sí con mTLS o, al menos, con un token fijo interno. Al ser local, puedes usar una red Docker aislada y confiar en que solo el Gateway tiene puerto expuesto.

---

### 📂 Estructura de Carpetas Sugerida (Monorepo)

```
/banking-core
├── apps
│   ├── api-gateway        (NestJS, expone REST)
│   ├── auth-service       (NestJS, puerto 3001)
│   ├── account-service    (NestJS + TypeORM, puerto 3002)
│   ├── transaction-service (NestJS + Kafka Producer)
│   ├── ledger-service     (NestJS + Kafka Consumer + Postgres locks)
│   └── audit-service      (NestJS, almacena eventos)
├── packages
│   ├── shared-types       (DTOs, interfaces de eventos)
│   └── database           (migraciones/prisma esquemas compartidos)
├── docker-compose.yml
├── docker-compose.prod.yml
└── turbo.json
```

### 🚀 ¿Por dónde empiezo ahora mismo?

1.  Clona un repo base de NestJS + Docker.
2.  Escribe el `docker-compose.yml` con Redpanda y Postgres. Levántalo.
3.  Crea el `Auth Service` con el login y genera los JWTs.
4.  Prueba con `curl` que el Gateway te devuelve un "Hello World" solo si el token es válido.

Una vez tengas eso, ya tienes el cimiento para empezar a meter las reglas de negocio bancarias. ¿Necesitas que profundice en la implementación de alguna fase en específico (ej. la lógica de partida doble o la idempotencia en Kafka)?
