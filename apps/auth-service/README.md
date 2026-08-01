# Auth Service

Servicio de autenticación con JWT RS256 + Argon2id.

## Configuración local

```bash
# Instalar dependencias
npm install

# Generar claves RS256
npm run keys:generate

# Crear base de datos auth_db (PostgreSQL debe estar corriendo)
psql postgresql://postgres:postgres@localhost:5432/postgres -c "CREATE DATABASE auth_db;"

# Ejecutar migraciones
npm run migration:run

# Iniciar en desarrollo
npm run start:dev
```

## Variables de entorno

Ver `.env.example`.

## Endpoints

- `POST /auth/register` — registrar usuario
- `POST /auth/login` — iniciar sesión
- `POST /auth/refresh` — renovar access token
- `POST /auth/logout` — cerrar sesión
- `GET /auth/me` — perfil del usuario autenticado
- `GET /health` — health check
- `GET /ready` — readiness check

## Roles

- `customer`
- `support`
- `auditor`
- `risk-analyst`
- `administrator`
- `service-account`
