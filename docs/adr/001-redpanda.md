# ADR-001: Redpanda como Event Broker

**Fecha**: 2026-07-25
**Estado**: Aceptado
**Decisores**: Equipo de arquitectura

## Contexto

Necesitamos un event broker para la comunicación asíncrona entre microservicios. Las opciones consideradas son Apache Kafka y Redpanda.

## Decisión

Usaremos **Redpanda** como event broker.

## Alternativas consideradas

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Apache Kafka | Ecosistema más amplio, más documentación, estándar de facto | Requiere Zookeeper (o KRaft que es más nuevo), más pesado en recursos para desarrollo local |
| Redpanda | Sin Zookeeper, compatible con API de Kafka, más ligero, arranque más rápido, single binary | Menos maduro que Kafka, ecosistema más pequeño |
| RabbitMQ | Más simple, buena para request-response | No diseñado para event streaming, sin replay de eventos, sin retención duradera |

## Consecuencias

- Compatibilidad con clientes Kafka estándar (kafkajs, spring-kafka, confluent-kafka-python)
- Menor consumo de recursos en desarrollo local
- Single binary sin dependencias externas (facilita `docker compose`)
- Si en el futuro se requiere Kafka puro, la migración es trivial (misma API)
- Redpanda Console incluido para monitoreo de topics

## Validación

- `docker compose up` con Redpanda + Console levanta en segundos
- Redpanda Console permite ver topics, consumidores, mensajes
