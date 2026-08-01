# Customer Service

## Responsabilidades

- CRUD de clientes bancarios
- Vinculación a identidad digital (`userId` de auth-service)
- Gestión de KYC (verificación de identidad)
- Emite eventos `CustomerRegistered`, `CustomerVerified`, `CustomerSuspended`, `CustomerContactUpdated`
- Direcciones, datos de contacto y estado del cliente

## Tecnologías

- TypeScript / NestJS
- TypeORM / PostgreSQL
- KafkaJS → Redpanda
- JWT RS256 (validación de tokens de auth-service)

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/customers` | Registrar cliente | JWT |
| GET | `/api/customers/me` | Consultar perfil propio (por userId del JWT) | JWT |
| GET | `/api/customers/:id` | Consultar cliente por ID | JWT |
| PUT | `/api/customers/:id` | Actualizar perfil y dirección | JWT |
| POST | `/api/customers/:id/verify-kyc` | Verificar KYC | JWT |
| POST | `/api/customers/:id/suspend` | Suspender cliente | JWT |
| POST | `/api/customers/:id/reactivate` | Reactivar cliente | JWT |
| GET | `/api/health` | Health check | No |
| GET | `/api/health/ready` | Readiness check | No |

## Eventos a Redpanda

Todos los eventos se publican en el topic `banking.customer.events` con el envelope estándar.

| Evento | Disparador |
|--------|----------|
| `CustomerRegistered` | POST /customers |
| `CustomerContactUpdated` | PUT /customers/:id (si hay cambios) |
| `CustomerVerified` | POST /customers/:id/verify-kyc |
| `CustomerSuspended` | POST /customers/:id/suspend |

## Comandos

```bash
npm install
npm run migration:run
npm run start:dev
npm test
docker build -t banking-customer-service:local -f apps/customer-service/Dockerfile .
```
