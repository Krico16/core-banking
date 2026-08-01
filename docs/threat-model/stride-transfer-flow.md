# Threat Model — Análisis STRIDE

**Fecha**: 2026-07-25
**Alcance**: Flujo de transferencia entre cuentas (el más crítico del MVP)
**Metodología**: STRIDE por componente

---

## Diagrama de flujo analizado

```
Customer → API Gateway → Payment Service → Risk Service
                                      ↓
                                 Ledger Service
                                      ↓
                              Notification Service
```

---

## 1. Spoofing (Suplantación de identidad)

| Amenaza | Componente | Severidad | Mitigación |
|---------|-----------|-----------|------------|
| Cliente suplanta a otro cliente | API Gateway | HIGH | JWT firmado RS256 con userId. Gateway valida firma, issuer, audiencia, expiración. |
| Servicio malicioso se hace pasar por otro | Comunicación inter-servicio | HIGH | Client Credentials con token interno. Red Docker aislada. mTLS en fase avanzada. |
| Ataque de replay de JWT | API Gateway | MEDIUM | Access token de corta duración (5-15 min). Nonce/timestamp en token. |
| Robo de refresh token | Auth Service | HIGH | Refresh token rotation (revocación al usar). HTTP-only, SameSite strict. |

---

## 2. Tampering (Manipulación de datos)

| Amenaza | Componente | Severidad | Mitigación |
|---------|-----------|-----------|------------|
| Modificar monto en tránsito | API Gateway → Payment | HIGH | HTTPS (TLS 1.3). Validación de integridad del JWT. |
| Modificar evento en Redpanda | Redpanda | HIGH | ACLs en Redpanda. Eventos con `eventId` único. Consumidores validan integridad del payload con JSON Schema. |
| Modificar asiento contable ya publicado | Ledger Service DB | CRITICAL | Tabla `ledger_entry` con permisos INSERT+SELECT (sin UPDATE/DELETE). Inmutabilidad por diseño. Errores se corrigen con reversiones. |
| Manipular saldo directamente | Ledger Service DB | CRITICAL | Solo ledger-service tiene credenciales de escritura en su BD. Saldo se calcula de asientos, no es campo mutable. |
| Modificar estado de pago externamente | Payment Service DB | HIGH | Optimistic locking (version). Solo payment-service escribe. |

---

## 3. Repudiation (Repudio)

| Amenaza | Componente | Severidad | Mitigación |
|---------|-----------|-----------|------------|
| Cliente niega haber hecho transferencia | Payment Service | HIGH | `Idempotency-Key` enviada por cliente. Audit trail completo con `correlationId`. `initiatedBy` en eventos. Timestamps auditables. |
| Servicio no registra quién ejecutó acción | Todos | HIGH | `producer` en cada evento. `audit-service` consume todos los eventos y los persiste append-only. |
| Logs insuficientes para auditoría | Todos | MEDIUM | Logs JSON estructurados con correlationId, userId, action, timestamp. Centralizados en Loki. |

---

## 4. Information Disclosure (Divulgación de información)

| Amenaza | Componente | Severidad | Mitigación |
|---------|-----------|-----------|------------|
| PII en eventos de Redpanda | Todos los productores | HIGH | Eventos no incluyen nombres completos, emails, direcciones. Solo IDs (customerId, accountId). |
| Datos sensibles en logs | Todos | HIGH | No loggear tokens, contraseñas, secretos. Sanitización de payloads antes de loggear. |
| Exposición de saldos de otros clientes | Query Service / API Gateway | CRITICAL | Autorización por `userId`. Validar que customerId del JWT coincide con el recurso solicitado. Scope `account:read:self`. |
| BD accesible desde otro contenedor | PostgreSQL | HIGH | Una BD por servicio. Credenciales diferentes por servicio. Red Docker interna separada. Sin puertos expuestos al host. |
| Secretos en imágenes Docker | Dockerfiles | HIGH | Secretos por variables de entorno montadas en runtime. Nunca en Dockerfile. `.env` en `.gitignore`. OpenBao en fase avanzada. |

---

## 5. Denial of Service (Denegación de servicio)

| Amenaza | Componente | Severidad | Mitigación |
|---------|-----------|-----------|------------|
| Inundación de peticiones HTTP | API Gateway | HIGH | Rate limiting por IP y por userId. Circuit breaker en gateway. Timeouts. |
| Consumidor lento bloquea Redpanda | Consumidores | MEDIUM | Consumer groups. Dead Letter Queue para eventos que fallan repetidamente. Lag monitoring. |
| Agotamiento de conexiones de BD | Todos los servicios | MEDIUM | Connection pool con límites. Timeouts de query. Health checks. |
| Ataque de fuerza bruta en login | Auth Service | HIGH | Rate limiting en endpoint de login. Bloqueo temporal tras N intentos fallidos. Argon2id con parámetros ajustados (memory=65536, iterations=3, parallelism=4). |
| Eventos infinitos en DLQ | Redpanda | MEDIUM | Alertas cuando DLQ no está vacía. Intervención manual requerida. |

---

## 6. Elevation of Privilege (Elevación de privilegios)

| Amenaza | Componente | Severidad | Mitigación |
|---------|-----------|-----------|------------|
| Cliente accede a endpoints de admin | API Gateway / Todos | CRITICAL | Validación de scopes en cada servicio. Roles definidos: customer, support, auditor, risk-analyst, administrator. Scopes granulares. |
| Cliente ejecuta operación de ledger | Ledger Service | CRITICAL | `ledger:post` disponible solo para service-account. Cliente NUNCA tiene este scope. |
| Cliente consulta cuentas de otro cliente | Query Service / Account Service | CRITICAL | Validación de propiedad: `customerId` del JWT debe coincidir con `customerId` del recurso. |
| Servicio interno con permisos excesivos | Todos | HIGH | Principio de mínimo privilegio. Cada servicio tiene scopes mínimos necesarios. Service accounts separadas. |
| Inyección SQL | Todos los servicios | CRITICAL | ORMs con parameterized queries (TypeORM, Hibernate). Nunca concatenar SQL con input de usuario. |

---

## Resumen de riesgos críticos (CRITICAL)

| Riesgo | Componente | Mitigación primaria |
|--------|-----------|---------------------|
| Modificar asientos contables publicados | Ledger DB | INSERT-only, inmutabilidad, reversiones |
| Manipular saldo directamente | Ledger DB | Solo ledger-service escribe, saldo derivado de asientos |
| Exponer saldos de otros clientes | Query/Gateway | Autorización por userId + scopes |
| Cliente accede a endpoints de admin | Gateway/Todos | Validación de roles y scopes por endpoint |
| Cliente ejecuta ledger:post | Ledger | Scope restringido a service-account |
| Inyección SQL | Todos | Parameterized queries, ORMs |

---

## Próximos pasos de seguridad (fases futuras)

- STRIDE detallado por cada bounded context
- Escaneo de dependencias (npm audit, OWASP Dependency Check)
- Escaneo de imágenes (Trivy)
- SBOM (Syft)
- Firmado de imágenes (Cosign)
- Secretos con OpenBao (rotación automática)
- mTLS entre servicios
- Network Policies en Kubernetes
- Pruebas de abuso y penetración
- Revisión de logs sensibles
