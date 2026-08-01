# Account Service

## Responsabilidades

- Apertura de cuentas bancarias vinculadas a clientes
- Gestión de estados de cuenta (ACTIVE, FROZEN, CLOSED)
- Límites diarios y por transacción
- Emite eventos `AccountOpened`, `AccountFrozen`, `AccountClosed`

## Tecnologías

- TypeScript / NestJS
- TypeORM / PostgreSQL
- KafkaJS → Redpanda
- JWT RS256 (validación de tokens de auth-service)
- Arquitectura Hexagonal (Ports & Adapters)

## Arquitectura Hexagonal

```
src/
├── domain/
│   ├── entities/account.entity.ts
│   ├── value-objects/ (AccountId, AccountNumber, Money, Currency, AccountType, AccountStatus)
│   ├── ports/ (AccountRepository, EventPublisher)
│   ├── events/ (AccountOpened, AccountFrozen, AccountClosed)
│   └── exceptions/
├── application/
│   ├── use-cases/ (OpenAccount, FreezeAccount, UnfreezeAccount, GetAccount)
│   └── dto/
├── infrastructure/
│   ├── persistence/ (ORM entity, mapper, repository)
│   ├── messaging/ (KafkaEventPublisher)
│   └── config/
├── presentation/
│   ├── controllers/
│   ├── guards/
│   └── dto/
```

## Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/accounts` | Abrir nueva cuenta | JWT |
| GET | `/api/accounts/:id` | Consultar cuenta por ID | JWT |
| GET | `/api/accounts/customer/:customerId` | Consultar cuentas de un cliente | JWT |
| POST | `/api/accounts/:id/freeze` | Congelar cuenta | JWT |
| POST | `/api/accounts/:id/unfreeze` | Descongelar cuenta | JWT |
| GET | `/api/health` | Health check | No |
| GET | `/api/health/ready` | Readiness check | No |

## Eventos a Redpanda

Todos los eventos se publican en el topic `banking.account.events` con el envelope estándar.

| Evento | Disparador |
|--------|----------|
| `AccountOpened` | POST /accounts |
| `AccountFrozen` | POST /accounts/:id/freeze |
| `AccountClosed` | (futuro) |

## Value Objects

- **AccountId**: Identificador único (ULID)
- **AccountNumber**: Número de cuenta (formato: código país + 10 dígitos)
- **Money**: Monto en centavos + moneda (enteros, nunca float)
- **Currency**: EUR, USD, GBP, CHF, JPY, MXN, COP, ARS, CLP, BRL, PEN (alineado con ledger-service)
- **AccountType**: CHECKING, SAVINGS
- **AccountStatus**: PENDING, ACTIVE, FROZEN, CLOSED

## Comandos

```bash
npm install
npm run migration:run
npm run start:dev
npm test
docker build -t banking-account-service:local -f apps/account-service/Dockerfile .
```

## Reglas de negocio

1. Cada cuenta está vinculada a un `customerId`
2. El balance se almacena en centavos (enteros) + moneda
3. Solo se puede congelar/descongelar cuentas ACTIVAS
4. Solo se puede cerrar cuentas con balance cero
5. No se puede operar (crédito/débito) en cuentas FROZEN o CLOSED
6. Los límites diarios y por transacción se validan en el ledger-service
