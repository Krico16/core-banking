# ADR-004: Worker de Outbox sobre Debezium

**Fecha**: 2026-07-25
**Estado**: Aceptado
**Decisores**: Equipo de arquitectura

## Contexto

Necesitamos garantizar que los eventos se publiquen al broker de forma atómica con la transacción de base de datos. Si se confirma la transacción pero falla la publicación del evento, los servicios consumidores nunca reciben la notificación del cambio.

## Decisión

Usaremos un **worker de outbox propio** (polling de tabla `outbox_event`) en lugar de Debezium (CDC).

## Alternativas consideradas

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Worker de outbox (polling) | Simple, sin infraestructura extra, control total, fácil de debugear | Latencia de polling (~100ms-1s), carga en BD por polling |
| Debezium + CDC | Tiempo real, sin polling, captura cambios de BD automáticamente | Requiere Debezium Connect, configuración compleja, overhead operacional para MVP |
| Publicación directa sin outbox | Más simple | Inconsistencia: puede confirmarse TX y fallar publicación |

## Consecuencias

- Cada servicio que publica eventos tiene una tabla `outbox_event`
- El worker lee de `outbox_event` con `SELECT ... FOR UPDATE SKIP LOCKED`
- Se publica a Redpanda y se marca como `published`
- Reintentos automáticos para eventos fallidos
- Dead Letter Queue para eventos que fallan repetidamente
- Latencia aceptable para MVP (sub-segundo con buen polling interval)

## Flujo

```
BEGIN
  INSERT INTO ledger_transaction (...);
  INSERT INTO ledger_entry (...);
  INSERT INTO outbox_event (id, event_type, payload, status, created_at)
    VALUES (gen_ulid(), 'LedgerTransactionPosted', '...json...', 'PENDING', now());
COMMIT

-- Worker (background thread)
SELECT * FROM outbox_event WHERE status = 'PENDING' ORDER BY created_at
  FOR UPDATE SKIP LOCKED LIMIT 100;

FOR EACH event:
  publish_to_redpanda(event)
  UPDATE outbox_event SET status = 'PUBLISHED', published_at = now()
```

## Validación

- `outbox_event` puede inspeccionarse directamente en BD para debugging
- No requiere infraestructura adicional en `compose.yaml`
