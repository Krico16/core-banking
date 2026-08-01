# ADR-007: Arquitectura Hexagonal (Ports & Adapters) como estándar

**Fecha**: 2026-07-25
**Estado**: Aceptado
**Decisores**: Equipo de arquitectura

## Contexto

Hemos construido dos servicios con patrones diferentes:
- `auth-service`: arquitectura hexagonal completa (domain/application/infrastructure/presentation)
- `customer-service`: arquitectura por capas tradicional (NestJS module-per-feature)

Necesitamos un estándar único que garantice testeabilidad, desacoplamiento del dominio respecto a la infraestructura, y alineación con Domain-Driven Design.

## Decisión

**Arquitectura Hexagonal (Ports & Adapters) como estándar obligatorio para todos los servicios.**

## Estructura canónica

```
service/
├── domain/               # Lógica de negocio pura
│   ├── entities/          # Entidades de dominio (sin ORM)
│   ├── value-objects/     # Value Objects inmutables con validación
│   ├── ports/             # Interfaces (contratos) — puertos
│   ├── events/            # Eventos de dominio (interfaces puras)
│   └── exceptions/        # Excepciones de dominio tipadas
├── application/           # Casos de uso
│   ├── use-cases/         # Un caso de uso por clase
│   └── dto/               # DTOs de entrada/salida
├── infrastructure/        # Adaptadores concretos
│   ├── persistence/       # ORM entities, mappers, repos
│   ├── messaging/         # Kafka/Redpanda publishers
│   ├── auth/              # Password hasher, JWT service
│   └── config/            # NestJS config modules
├── presentation/          # HTTP / API
│   ├── controllers/       # REST endpoints
│   ├── guards/            # AuthZ guards
│   ├── strategies/        # Passport strategies
│   └── decorators/        # @CurrentUser, @Roles
├── main.ts
├── app.module.ts
└── Dockerfile
```

## Reglas de dependencia (estrictas)

```
presentation → application → domain
                   ↑
             infrastructure (implementa domain/ports/)
```

1. `domain/` **nunca** importa de `application/`, `infrastructure/`, ni `presentation/`
2. `application/` **nunca** importa de `infrastructure/` ni `presentation/`
3. La inyección de dependencias usa **tokens de símbolo** (no clases concretas):

```typescript
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repo: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}
}
```

4. Las entidades de dominio usan `static create()` (nuevas) y `static reconstruct()` (desde BD)
5. Los mappers traducen `ORM Entity ↔ Domain Entity` en `infrastructure/persistence/mappers/`
6. Los eventos de dominio se definen en `domain/events/` como clases/interface puras
7. Los adaptadores de mensajería en `infrastructure/messaging/` convierten eventos de dominio al envelope estándar

## Alternativas consideradas

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Hexagonal (elegida) | Dominio puro, alta testeabilidad, DDD-friendly, dependency inversion | Más archivos, curva de aprendizaje, overhead inicial |
| Capas tradicionales (NestJS) | Simple, rápido, bien documentado en NestJS | Dominio acoplado al ORM, difícil testear sin BD, lógica dispersa |
| CQRS puro (@nestjs/cqrs) | Separación comandos/queries, event sourcing ready | Complejidad excesiva para servicios simples (customer es CRUD), no necesario en MVP |

## Consecuencias

- **Todos los servicios nuevos** deben seguir esta estructura
- **Servicios existentes** deben refactorizarse progresivamente
- El `customer-service` es el primer candidato a refactorizar
- Las plantillas base de servicio se estandarizan con esta estructura
- Los tests unitarios pueden mockear puertos sin levantar BD

## Validación

- `auth-service` ya implementa esta arquitectura → referencia canónica
- `customer-service` refactorizado a hexagonal → validación en progreso
- Futuros servicios (`account-service`, `payment-service`, etc.) partirán de esta estructura
