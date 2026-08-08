# Threat Model — Análisis STRIDE

**Fecha original**: 2026-07-25
**Revisado**: 2026-08-06 (fase 9) — contra el código real de los 9 servicios. La versión
2026-07-25 se escribió en fase 0, antes de que existieran payment-service, risk-service,
notification-service, query-service y api-gateway; varias mitigaciones que describía
(scopes, `audit-service`, DLQ, circuit breaker, mTLS/token interno) nunca se implementaron
y este repaso las marca explícitamente como pendientes en vez de darlas por hechas.
**Alcance**: Flujo de transferencia entre cuentas (el más crítico del sistema)
**Metodología**: STRIDE por componente, verificado línea por línea contra el código
(controllers, guards, `compose.yaml`) — no solo contra el diseño de `docs/architecture/`.

---

## Diagrama de flujo real (verificado)

```
Customer → API Gateway (JWT RS256) → Payment Service (saga) → Risk Service (sin API HTTP)
                                              ↓
                                        Ledger Service (posting real)
                                              ↓
                            Notification Service · Query Service (proyecciones)
```

`risk-service` no tiene rutas de negocio HTTP expuestas (`main.py` solo registra
`health_router` y `metrics_router`) — solo consume Kafka. Correcto según el diseño.

---

## ⚠️ Hallazgos críticos verificados en este repaso (2026-08-06)

Estos son gaps reales confirmados en el código, no amenazas hipotéticas. Se degradan a
"aceptado temporalmente" solo porque el stack no está expuesto a internet — dejan de ser
aceptables en cuanto exista cualquier plan de desplegar fuera de `localhost`.

1. **`ledger-service` no tiene autenticación HTTP de ningún tipo.** No hay
   `spring-boot-starter-security` en `pom.xml`, no hay `SecurityFilterChain`, ningún
   filtro de JWT. `LedgerController` expone `POST /deposit`, `POST /withdraw`,
   `POST /transfer`, `POST /reverse` y `POST /accounts` sin ningún guard — y el puerto
   `3004` está mapeado al host (`compose.yaml`), así que hoy son alcanzables
   directamente desde `localhost:3004`, sin pasar por api-gateway. Esto invalida
   completamente la mitigación que la versión anterior de este documento asumía
   (`ledger:post` restringido a service-account vía scopes) — ese sistema de scopes
   nunca se construyó.
2. **`payment-service` tampoco tiene guard alguno.** `POST /api/payments/transfer`
   (`payments.controller.ts`) es alcanzable sin JWT en `localhost:3005`, saltándose
   la verificación de identidad y el rate limiting de api-gateway.
3. **`query-service` y `notification-service` exponen lectura de datos de cualquier
   cliente sin autenticación.** `GET /api/accounts/:id/transactions`,
   `GET /api/customers/:id/dashboard`, `GET /api/notifications/:subjectId` no
   verifican que el `customerId` solicitado pertenezca al caller — porque no hay
   caller autenticado en absoluto a ese nivel. La mitigación de "Information
   Disclosure" de la versión anterior (`Autorización por userId`, `Scope
   account:read:self`) es aspiracional, no implementada.
4. **Solo 2 de 9 servicios (`account-service`, `customer-service`) verifican JWT
   propio**, y solo desde el 2026-08-06 (ver `CLAUDE.md` — antes ambos caían a
   `jwt.decode()` sin verificar firma). `auth-service` y `api-gateway` lo verifican
   por diseño (son el borde de autenticación). Los 5 restantes
   (`ledger`, `payment`, `risk`, `notification`, `query`) confían ciegamente en que
   solo api-gateway les habla — supuesto que la red Docker no hace cumplir, y que
   los puertos mapeados al host rompen directamente.
5. **Todos los 9 servicios de negocio + Postgres tienen su puerto mapeado al host**
   (`5432`, `3001`-`3009` en `compose.yaml`). Esto es intencional para desarrollo
   local, pero significa que la superficie de ataque real hoy no es "API Gateway como
   único borde" (el diseño en `docs/architecture/api-gateway.md`) sino "9 servicios +
   Postgres directamente alcanzables", y las mitigaciones de este documento deben
   asumir eso, no el diagrama idealizado.
6. **Postgres es una única instancia compartida** (un solo `ports: 5432:5432`, una
   base de datos lógica por servicio dentro de la misma instancia física) — "una BD
   por servicio" es un aislamiento lógico (credenciales/esquema), no físico. Un
   compromiso del proceso Postgres o de credenciales de superusuario expone las 9
   bases a la vez, no solo una.

**Conclusión**: el ítem de fase 9 "mTLS o token interno de servicio-a-servicio" no es
un endurecimiento incremental — hoy es la única barrera ausente entre "cualquier
proceso en la máquina host" y "postear asientos contables directamente". Se recomienda
priorizarlo antes que STRIDE de otros bounded contexts o que escaneo de imágenes.

---

## 1. Spoofing (Suplantación de identidad)

| Amenaza | Componente | Severidad | Estado real | Mitigación pendiente |
|---------|-----------|-----------|-------------|----------------------|
| Cliente suplanta a otro cliente | API Gateway | HIGH | ✅ Mitigado — JWT RS256 verificado (firma/issuer/audience/exp) en `rs256-token-verifier.ts`. | — |
| Servicio malicioso se hace pasar por otro | Comunicación inter-servicio | **CRITICAL** (subida desde HIGH) | ❌ **No implementado.** Sin mTLS, sin token de servicio-a-servicio. Ver hallazgo #1/#2 arriba: `ledger-service` y `payment-service` no verifican que el caller sea api-gateway. | Diseñar e implementar mTLS o JWT interno de service-account (fase 9, ítem explícito del roadmap). |
| Ataque de replay de JWT | API Gateway | MEDIUM | Parcial — access token de vida corta (verificar TTL real en `auth.config.ts` de auth-service), pero sin verificación de nonce/jti contra reuso. | Agregar `jti` + blacklist de tokens revocados si se detecta necesidad real (hoy no hay endpoint de revocación de access token, solo de refresh token). |
| Robo de refresh token | Auth Service | HIGH | ✅ Mitigado — rotación real confirmada en `refresh-token.use-case.ts` (revoca el token usado, emite uno nuevo). | Confirmar cookies HTTP-only/SameSite en el cliente cuando exista `web-app` (fase 8+, aún carpeta vacía). |
| Fuerza bruta de credenciales | Auth Service | HIGH | ✅ Mitigado — `login.use-case.ts` registra `failedLoginAttempts` y bloquea (`isLocked()`/`UserLockedException`). | — |

---

## 2. Tampering (Manipulación de datos)

| Amenaza | Componente | Severidad | Estado real | Mitigación pendiente |
|---------|-----------|-----------|-------------|----------------------|
| Modificar monto en tránsito | API Gateway → Payment | HIGH | Parcial — sin TLS entre contenedores (todo el tráfico interno es HTTP plano dentro de la red Docker); solo el borde público tendría TLS en un despliegue real, y hoy ni siquiera hay despliegue con TLS configurado. | TLS interno o mTLS (mismo ítem que Spoofing #2). |
| Modificar evento en Redpanda | Redpanda | HIGH | Parcial — eventos tienen `eventId` único y los tests de contrato (`tests/contract/`) validan el payload contra JSON Schema en el consumidor, pero **sin ACLs de Redpanda** (cualquier proceso con acceso a la red Docker puede producir/consumir en cualquier topic). | ACLs de Redpanda por servicio (no implementado, no en el roadmap de fase 9 explícitamente — agregar). |
| Modificar asiento contable ya publicado | Ledger Service DB | CRITICAL | ✅ Mitigado por diseño de aplicación — `JournalEntryJpaRepository`/`LedgerEntry` no exponen update/delete, solo insert + reversiones. **No verificado a nivel de GRANT de Postgres** (no hay `REVOKE UPDATE/DELETE` explícito en las migraciones Flyway) — la inmutabilidad depende de que el código de la aplicación nunca llame update, no de un permiso de BD que lo impida. | Agregar `REVOKE UPDATE, DELETE ON ledger_entries FROM ledger_app_user` a nivel de migración para que la inmutabilidad sea estructural, no solo convención de código — más relevante todavía dado el hallazgo #1 (ledger-service sin auth HTTP: si alguien más consigue credenciales de BD, hoy nada a nivel de motor se lo impide). |
| Manipular saldo directamente | Ledger Service DB | CRITICAL | ✅ Mitigado — saldo derivado de suma de `ledger_entries`, no es columna mutable. | — |
| Modificar estado de pago externamente | Payment Service DB | HIGH | Sin verificar si hay optimistic locking (`@VersionColumn`) en la entidad de pago — pendiente de confirmar en `payment.orm-entity.ts`. | Confirmar y, si falta, agregar. |

---

## 3. Repudiation (Repudio)

| Amenaza | Componente | Severidad | Estado real | Mitigación pendiente |
|---------|-----------|-----------|-------------|----------------------|
| Cliente niega haber hecho transferencia | Payment Service | HIGH | Parcial — `Idempotency-Key` y `correlationId`/`causationId` existen en el envelope estándar (regla #8 de `CLAUDE.md`), pero **no hay `audit-service`**. Nunca se construyó — el nombre viene de `Propuesta-2.md`/`Propuesta-4.md` (documentos de diseño previos al MVP real), no del código. | Si se necesita audit trail append-only real, construirlo como servicio nuevo o como consumidor adicional sobre los topics existentes — no asumir que ya existe. |
| Servicio no registra quién ejecutó acción | Todos | HIGH | Parcial — `producer` sí está en cada evento (envelope estándar). Sin agregación centralizada de auditoría más allá de los logs de Loki. | — |
| Logs insuficientes para auditoría | Todos | MEDIUM | ✅ Mitigado — logs JSON estructurados (Pino en NestJS, equivalentes en Java/Python) con `correlationId` = `traceId` de OTel (fase 8), centralizados en Loki. | — |

---

## 4. Information Disclosure (Divulgación de información)

| Amenaza | Componente | Severidad | Estado real | Mitigación pendiente |
|---------|-----------|-----------|-------------|----------------------|
| PII en eventos de Redpanda | Todos los productores | HIGH | ✅ Mitigado por diseño — envelope estándar (regla #8) usa solo IDs (`customerId`, `accountId`), sin PII. | — |
| Datos sensibles en logs | Todos | HIGH | No verificado exhaustivamente — no se encontró sanitización explícita de payloads antes de loggear en los helpers de logging revisados. | Auditar cada `logger.info/warn/error` que reciba el payload completo de un evento o request. |
| Exposición de saldos/datos de otros clientes | Query Service / Notification Service | **CRITICAL** (confirmado, no solo teórico — ver hallazgo #3) | ❌ **No mitigado.** No hay verificación de que el `customerId` del caller coincida con el recurso pedido, porque no hay caller autenticado en esos servicios. | Agregar guard de autorización (mínimo: JWT propio + comparación de `customerId`) en query-service y notification-service, o — más barato — moverlos a solo-red-interna (quitar el mapeo de puerto al host) hasta que exista auth propia. |
| BD accesible desde otro contenedor | PostgreSQL | HIGH | Parcial — credenciales distintas por servicio/BD lógica (bien), pero ver hallazgo #6: instancia física compartida, y el puerto **sí** está expuesto al host (`5432:5432`), contradiciendo la mitigación original ("sin puertos expuestos al host"). | Quitar el mapeo de puerto al host fuera de desarrollo local, o al menos documentarlo como aceptado-solo-en-dev. |
| Secretos en imágenes Docker | Dockerfiles | HIGH | ✅ Mitigado — variables de entorno en runtime, `.env` en `.gitignore` (confirmado). Sin OpenBao ni rotación automática (no iniciado, correctamente fuera de alcance de fase 9 según `AGENTS.md`). | — |

---

## 5. Denial of Service (Denegación de servicio)

| Amenaza | Componente | Severidad | Estado real | Mitigación pendiente |
|---------|-----------|-----------|-------------|----------------------|
| Inundación de peticiones HTTP | API Gateway | HIGH | Parcial — rate limiting real confirmado (`rate-limit.middleware.ts`, `express-rate-limit`, configurable vía `RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX`, default 100 req/60s), **por IP**, no por `userId`. Sin circuit breaker (no se encontró implementación). Y dado el hallazgo #5, un atacante puede saltarse el rate limit del gateway pegándole directo a `payment-service:3005` o `ledger-service:3004`. | Rate limiting también en los servicios internos (no solo en el borde), o cerrar los puertos al host. Evaluar circuit breaker si el volumen lo justifica (hoy YAGNI para un proyecto educativo de este tamaño). |
| Consumidor lento bloquea Redpanda | Consumidores | MEDIUM | Parcial — consumer groups sí (uno por servicio, patrón estándar de Kafka/Redpanda). **Sin Dead Letter Queue** — no se encontró ningún topic ni código de DLQ en ningún servicio. Un evento que falla repetidamente hoy simplemente reintenta indefinidamente (o se pierde según el manejo de errores de cada consumer, no auditado exhaustivamente aquí). | Definir política real: ¿reintento con backoff + DLQ, o alerta manual? No está decidido, no solo "no implementado". |
| Agotamiento de conexiones de BD | Todos los servicios | MEDIUM | Sin verificar límites de connection pool explícitos en cada servicio (TypeORM/Hibernate/SQLAlchemy tienen defaults, no se confirmó que estén ajustados a los límites de recursos de `compose.yaml` — ver resource limits agregados en la sesión anterior). | Verificar que `max connections` de cada pool sea coherente con los límites de CPU/memoria ya aplicados por servicio. |
| Ataque de fuerza bruta en login | Auth Service | HIGH | ✅ Mitigado — ver sección Spoofing (bloqueo de cuenta tras intentos fallidos) + Argon2id con `memory=65536, iterations=3, parallelism=4` (confirmado en `app.config.ts`, valores reales, no aspiracionales). | — |
| Eventos infinitos en DLQ | Redpanda | MEDIUM | N/A — no hay DLQ que pueda llenarse (ver arriba). | — |

---

## 6. Elevation of Privilege (Elevación de privilegios)

| Amenaza | Componente | Severidad | Estado real | Mitigación pendiente |
|---------|-----------|-----------|-------------|----------------------|
| Cliente accede a endpoints de admin | API Gateway / Todos | **CRITICAL** | ❌ **No mitigado.** No existe ningún sistema de roles/scopes en ningún servicio — confirmado por grep: cero referencias a `scope` fuera de este documento y de los `Propuesta-*.md` de diseño previo. `api-gateway` solo valida que el JWT sea válido, no aplica mapeo ruta→scope (confirmado también en `CLAUDE.md`, deuda documentada). | Es el gap más grande de autorización del sistema. Decidir si vale la pena para un proyecto educativo de este tamaño, o documentarlo como límite aceptado explícito (YAGNI) en vez de dejarlo como "pendiente" indefinido. |
| Cliente ejecuta operación de ledger directamente | Ledger Service | **CRITICAL** | ❌ **No mitigado — confirmado explotable** (hallazgo #1). No hay scope `ledger:post` ni ningún otro control; cualquiera con acceso de red al puerto 3004 puede postear asientos. | Prioridad #1 de fase 9: guard de auth en ledger-service (mínimo JWT + verificación de que el issuer sea un service-account, no un usuario final). |
| Cliente consulta cuentas/dashboards de otro cliente | Query Service / Account Service | HIGH en account-service (mitigado), **CRITICAL** en query-service (no mitigado) | account-service sí valida propiedad vía su JWT guard (arreglado 2026-08-06). query-service no tiene guard, ver hallazgo #3. | Extender el mismo patrón de guard de account-service/customer-service a query-service y notification-service. |
| Servicio interno con permisos excesivos | Todos | HIGH | Parcial — cada servicio tiene su propia BD/credenciales (buen mínimo privilegio a nivel de datos), pero a nivel de red/HTTP cualquier servicio puede llamar a cualquier otro sin restricción (no hay Network Policies — eso es fase 10/K3s, razonable dejarlo para entonces). | — |
| Inyección SQL | Todos los servicios | CRITICAL | ✅ Mitigado — TypeORM (NestJS), Hibernate/JPA (ledger-service), SQLAlchemy (risk-service), todos con queries parametrizadas por defecto; no se encontró concatenación de SQL crudo con input de usuario en el código revisado. | — |

---

## Resumen de riesgos críticos (CRITICAL) — actualizado

| Riesgo | Componente | Estado |
|--------|-----------|--------|
| Ledger-service sin autenticación HTTP, endpoints de posting expuestos | Ledger | ❌ Explotable hoy (puerto host 3004) |
| Payment-service sin autenticación HTTP en `/transfer` | Payment | ❌ Explotable hoy (puerto host 3005) |
| Sin mTLS/token interno servicio-a-servicio | Todos | ❌ No implementado — causa raíz de los dos anteriores |
| Query/notification-service exponen datos de cualquier cliente | Query, Notification | ❌ Explotable hoy (puertos host 3007/3008) |
| Sin sistema de roles/scopes en ningún servicio | Todos | ❌ Nunca implementado (aspiracional desde fase 0) |
| Modificar asientos contables publicados | Ledger DB | ✅ Mitigado a nivel de aplicación (no a nivel de GRANT de BD) |
| Manipular saldo directamente | Ledger DB | ✅ Mitigado — saldo derivado, no mutable |
| Inyección SQL | Todos | ✅ Mitigado — ORMs parametrizados |

---

## Próximos pasos de seguridad (orden recomendado, reemplaza la lista anterior)

1. **Guard de autenticación en ledger-service y payment-service** (mínimo viable:
   validar el mismo JWT RS256 que api-gateway ya verifica, reusando la clave pública
   ya montada). Esto solo no resuelve spoofing de servicio a servicio, pero cierra el
   agujero más grave (cliente final pegándole directo al ledger).
2. **mTLS o JWT de service-account interno** — resuelve spoofing servicio-a-servicio
   de raíz, ítem explícito de fase 9.
3. **Guard equivalente en query-service y notification-service** (autorización por
   `customerId`, no solo autenticación).
4. Decidir explícitamente (documentar, no dejar implícito) el alcance de: sistema de
   roles/scopes, ACLs de Redpanda, DLQ, `audit-service` — para cada uno, o se
   implementa en fase 9/10 o se declara YAGNI documentado (como ya se hizo con
   `FundsHeld`/`FundsReleased`).
5. Escaneo de imágenes (Trivy), SBOM (Syft), cifrado en reposo de Postgres, backups
   con prueba de restauración real — sin cambios respecto al roadmap original, siguen
   pendientes y no tienen dependencia de lo anterior.
6. Network Policies — diferido a fase 10 (K3s), tiene más sentido ahí que en Compose.
