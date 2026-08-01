# ADR-002: Monorepo

**Fecha**: 2026-07-25
**Estado**: Aceptado
**Decisores**: Equipo de arquitectura

## Contexto

Necesitamos definir la estrategia de repositorios para un proyecto con ~9 microservicios en 3 lenguajes (TypeScript, Java, Python).

## Decisión

Usaremos **monorepo** como estrategia de repositorio.

## Alternativas consideradas

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Monorepo | Cambios coordinados, refactors atómicos, contratos compartidos, CI unificado | Mayor tamaño de repo, herramientas de build más complejas |
| Multirepo | Independencia total, builds aislados, propiedad clara | Coordinación entre repos difíciles, versionado de contratos complejo, CI disperso |
| Polyrepo híbrido | Flexibilidad | Complejidad operativa innecesaria para este tamaño |

## Consecuencias

- Estructura unificada bajo `banking/`
- `contracts/` compartido para JSON Schema, AsyncAPI, OpenAPI
- `libraries/` compartido para utilidades cross-language (envelope de eventos, observabilidad)
- Workspaces de npm para apps TypeScript
- Cambios en contratos de eventos se propagan a todos los servicios en un solo PR
- CI puede validar todo el sistema en cada commit

## Validación

- `package.json` con workspaces configurados
- Directorios `apps/`, `contracts/`, `libraries/`, `platform/`, `docs/`
