# Auth Service

## Responsabilidades

- Registro de usuarios
- Login con JWT RS256 + Argon2id
- Refresh token con rotación
- Logout por sesión o global
- Roles y scopes
- Gestión de intentos fallidos y bloqueo temporal

## Tecnologías

- TypeScript / NestJS
- TypeORM / PostgreSQL
- JWT RS256 (asimétrico)
- Argon2id

## Estructura

```
auth-service/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── token.service.ts
│   │   ├── auth.module.ts
│   │   ├── dto/
│   │   ├── entities/
│   │   │   └── refresh-token.entity.ts
│   │   ├── guards/
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── jwt-refresh.strategy.ts
│   │   └── interfaces/
│   ├── users/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   ├── dto/
│   │   └── entities/
│   │       └── user.entity.ts
│   ├── health/
│   ├── config/
│   ├── common/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   └── logger/
│   ├── migrations/
│   ├── main.ts
│   └── app.module.ts
├── scripts/
│   └── generate-keys.js
├── keys/
│   ├── private.pem
│   └── public.pem
├── Dockerfile
├── docker-compose.local.yml
├── package.json
└── .env.example
```

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Registrar usuario | No |
| POST | `/api/auth/login` | Login | No |
| POST | `/api/auth/refresh` | Renovar access token | Refresh token |
| POST | `/api/auth/logout` | Cerrar sesión | Refresh token |
| POST | `/api/auth/logout-all` | Cerrar todas las sesiones | Access token |
| GET | `/api/auth/me` | Perfil del usuario | Access token |
| GET | `/api/users/me` | Perfil del usuario (alternativo) | Access token |
| GET | `/api/health` | Health check | No |
| GET | `/api/health/ready` | Readiness check | No |

## Roles

- `customer` — cliente bancario
- `support` — soporte
- `auditor` — auditor
- `risk-analyst` — analista de riesgo
- `administrator` — administrador
- `service-account` — cuenta de servicio

## Flujo de tokens

1. **Login**: access token (15m) + refresh token (7d)
2. **Refresh**: se envía refresh token, se revoca el anterior y se emite uno nuevo
3. **Logout**: se revoca el refresh token actual
4. **Logout-all**: se revocan todos los refresh tokens del usuario

## Seguridad

- Contraseñas hasheadas con Argon2id (memory=65536, iterations=3, parallelism=4)
- JWT firmado con RS256 (clave privada en auth-service, pública distribuida)
- Bloqueo temporal tras 5 intentos fallidos
- Tokens de refresh almacenados con ID único (jti) para revocación
- Scopes derivados de roles
- `aud` e `iss` validados en cada token

## Variables de entorno

Ver `.env.example`.

## Comandos

```bash
# Instalar dependencias
npm install

# Generar claves RS256
npm run keys:generate

# Crear base de datos
psql postgresql://postgres:postgres@localhost:5432/postgres -c "CREATE DATABASE auth_db;"

# Ejecutar migraciones
npm run migration:run

# Iniciar en desarrollo
npm run start:dev

# Ejecutar tests
npm test

# Construir imagen Docker
docker build -t banking-auth-service:local -f apps/auth-service/Dockerfile .
```

## Notas

- Las claves `./keys/private.pem` y `./keys/public.pem` NO deben commitearse.
- En producción las claves deben montarse como secretos (Docker secrets, OpenBao, etc.).
- El Dockerfile usa `npm install` en lugar de `npm ci` porque el package-lock.json no se copia al contexto de build. Para producción se recomienda generar un `package-lock.json` y usar `npm ci`.
