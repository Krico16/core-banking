# ADR-006: Saga Orquestada

**Fecha**: 2026-07-25
**Estado**: Aceptado
**Decisores**: Equipo de arquitectura

## Contexto

Las transferencias entre cuentas involucran múltiples servicios (payment, risk, ledger) y requieren consistencia sin transacciones distribuidas. Necesitamos un mecanismo de coordinación.

## Decisión

Usaremos **saga orquestada** con `payment-service` como orquestador.

## Alternativas consideradas

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Saga orquestada | Estado centralizado, fácil de observar y debugear, lógica clara | Orquestador es single point of failure, acoplamiento al orquestador |
| Saga coreografiada | Totalmente desacoplada, sin SPOF | Difícil de seguir, lógica dispersa, difícil manejar timeouts y compensaciones |
| 2PC (Two-Phase Commit) | Consistencia fuerte | Bloqueante, no escala, no adecuado para microservicios |

## Consecuencias

- `payment-service` mantiene la máquina de estados de cada pago
- Transiciones: CREATED → VALIDATING → RISK_REVIEW → AUTHORIZED → POSTING → COMPLETED
- Cada paso emite eventos y espera respuestas
- Si un paso falla, el orquestador inicia compensación (reversión)
- Timeouts: si un paso no responde en N segundos, se considera FAILED
- El estado del pago persiste en BD de payment-service (recuperable tras crash)

## Flujo de compensación

```
Payment COMPLETED
  → Se solicita reversión
  → payment-service emite PaymentReversalRequested
  → ledger-service crea asientos inversos
  → ledger-service emite LedgerTransactionReversed
  → payment-service consume → actualiza a REVERSED
  → payment-service emite PaymentReversed
```

## Riesgos

- Orquestador debe ser idempotente y recuperable tras crash
- Timeouts deben ser configurables por paso
- Si el orquestador muere tras enviar comando al ledger pero antes de recibir respuesta, debe reconciliar estado al reiniciar

## Validación

- Transferencia completa: PaymentCreated → PaymentCompleted
- Fallo de risk: PaymentCreated → PaymentRejected
- Timeout de ledger: PaymentCreated → PaymentFailed
- Compensación: PaymentCompleted → PaymentReversed
