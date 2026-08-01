# ADR-003: JSON Schema para Contratos de Eventos (MVP)

**Fecha**: 2026-07-25
**Estado**: Aceptado
**Decisores**: Equipo de arquitectura

## Contexto

Necesitamos definir el formato de serialización y esquema para los eventos que fluyen por Redpanda. Las opciones son JSON Schema, Avro y Protobuf.

## Decisión

Usaremos **JSON Schema** para el MVP. Se reevaluará Avro/Protobuf con Schema Registry en fase avanzada si se requiere evolución fuerte de esquemas.

## Alternativas consideradas

| Alternativa | Pros | Contras |
|-------------|------|---------|
| JSON Schema | Legible, sin tooling especial, fácil debugging, bueno para MVP | Mayor tamaño de mensaje, sin evolución nativa de esquemas, validación manual |
| Avro + Schema Registry | Evolución de esquemas nativa, binario compacto, validación automática | Requiere Schema Registry (Apicurio/Confluent), tooling adicional, menos legible |
| Protobuf + Schema Registry | Binario compacto, tipado fuerte, code generation | Requiere Schema Registry, tooling, code generation obligatoria |

## Consecuencias

- Eventos legibles directamente en Redpanda Console
- Sin dependencia de Schema Registry en MVP
- Validación manual de compatibilidad (solo añadir campos opcionales)
- JSON Schema en `contracts/json-schema/` como fuente de verdad
- AsyncAPI en `contracts/asyncapi/` para documentar canales
- Migración futura a Avro/Protobuf requeriría adaptar productores/consumidores

## Reglas de evolución de esquemas (manual)

1. No eliminar campos requeridos
2. No cambiar tipos de campos existentes
3. Añadir solo campos opcionales
4. Incrementar `eventVersion` en cambios no compatibles
5. No reutilizar un `eventType` con semántica diferente

## Validación

- JSON Schema para cada evento en `contracts/json-schema/events/`
- Envelope estándar definido en `contracts/json-schema/event-envelope.json`
