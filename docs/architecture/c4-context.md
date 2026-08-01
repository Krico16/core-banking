# C4 Nivel 1 — Diagrama de Contexto

## Actores

| Actor | Descripción |
|-------|-------------|
| **Customer** | Cliente bancario. Usa la web app o app móvil para consultar saldo, hacer transferencias. |
| **Support Agent** | Agente de soporte. Gestiona clientes, revisa cuentas, atiende incidencias. |
| **Auditor** | Auditor interno/externo. Consulta eventos, verifica integridad contable. |
| **Risk Analyst** | Analista de riesgo. Revisa operaciones marcadas, ajusta reglas. |
| **Administrator** | Administrador del sistema. Gestiona usuarios internos, configuración. |

## Diagrama

```mermaid
C4Context
  title Banking Core — Contexto del Sistema

  Person(customer, "Customer", "Cliente bancario")
  Person(support, "Support Agent", "Soporte y gestión")
  Person(auditor, "Auditor", "Auditoría y compliance")
  Person(risk_analyst, "Risk Analyst", "Análisis de riesgo")
  Person(admin, "Administrator", "Administración del sistema")

  System(banking, "Banking Platform", "Core bancario: cuentas, ledger, pagos, notificaciones")

  Rel(customer, banking, "Consulta saldo, transfiere fondos, recibe notificaciones", "HTTPS/JWT")
  Rel(support, banking, "Gestiona clientes y cuentas", "HTTPS/JWT")
  Rel(auditor, banking, "Consulta eventos y auditoría", "HTTPS/JWT")
  Rel(risk_analyst, banking, "Revisa operaciones y ajusta reglas", "HTTPS/JWT")
  Rel(admin, banking, "Administra usuarios y configuración", "HTTPS/JWT")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```
