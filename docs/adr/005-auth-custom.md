# ADR-005: Auth Custom JWT RS256 + Argon2id

**Fecha**: 2026-07-25
**Estado**: Aceptado
**Decisores**: Equipo de arquitectura

## Contexto

Necesitamos autenticación y autorización para la plataforma. Las opciones son usar Keycloak (OIDC provider externo) o implementar auth propia con JWT + Argon2id.

## Decisión

Implementaremos **auth-service propio** con JWT RS256 (firma asimétrica) y Argon2id para hashing de contraseñas. Sin dependencia de Keycloak.

## Alternativas consideradas

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Keycloak | OIDC completo, MFA, social login, estándar industrial | Contenedor pesado (~1GB), configuración compleja, requiere wrapper, menos control |
| Auth custom | Ligero, control total, sin dependencias externas, aprendizaje | Implementar refresh tokens, rotación, MFA desde cero |
| Auth0/Proveedor cloud | Cero mantenimiento | Dependencia de terceros, no alineado con "sin cloud" |

## Consecuencias

- **auth-service** en NestJS implementa:
  - Registro con Argon2id (salt único por usuario)
  - Login con JWT RS256 (clave privada en auth-service, clave pública distribuida)
  - Access token de corta duración (5-15 min)
  - Refresh token con rotación (revocación al usar)
  - Roles: customer, support, auditor, risk-analyst, administrator, service-account
  - Scopes: `payment:create`, `account:read:self`, `ledger:post` (interno), etc.
- API Gateway valida JWT con clave pública (sin llamar a auth-service en cada request)
- Clientes de servicio a servicio: Client Credentials con token interno
- mTLS se añadirá en fase avanzada
- No incluye PII en el token JWT (solo userId, roles, scopes)

## Riesgos

- Implementación correcta de refresh token rotation (revocar token anterior al rotar)
- Gestión segura de claves privadas RS256
- Implementación de MFA desde cero en fase avanzada
- Rate limiting de intentos de login

## Validación

- Login funcional → access token + refresh token
- Gateway rechaza peticiones sin JWT válido
- Gateway rechaza JWT expirado, issuer incorrecto, audiencia incorrecta
