import { getDataValidator, knownEventTypes } from './helpers/schema-registry';
import { loadCapturedEvents } from './fixtures/captured-events';
import { syntheticEvents } from './fixtures/synthetic-events';

/**
 * docs/events/catalog.md documenta 22 tipos de evento activos (excluyendo
 * FundsHeld/FundsReleased, deliberadamente diferidos — ver ledger-service.md).
 * Solo 12 tienen JSON Schema real en contracts/json-schema/events/ hoy. Estos
 * 10 son el hueco real, documentado explícitamente (no una aserción que se
 * pueda dejar pasar en silencio): agregar el schema y mover la entrada de
 * abajo a la lista de tipos cubiertos es lo que cierra cada uno.
 */
const documentedWithoutSchema = [
  'CustomerVerified',
  'CustomerSuspended',
  'CustomerContactUpdated',
  'AccountFrozen',
  'AccountClosed',
  'LedgerTransactionReversed',
  'PaymentFailed',
  'PaymentReversalRequested',
  'PaymentReversed',
  'PaymentFlaggedForReview',
];

describe('Payload de eventos contra su schema específico (contracts/json-schema/events/*.json)', () => {
  const captured = loadCapturedEvents();
  const allEvents = [...captured, ...syntheticEvents];

  test('hay schemas cargados', () => {
    expect(knownEventTypes.length).toBe(12);
  });

  const eventsWithSchema = allEvents.filter((event) => knownEventTypes.includes(event.eventType));

  test.each(eventsWithSchema.map((event) => [event.eventType, event] as const))(
    '%s cumple su schema',
    (eventType, event) => {
      const validate = getDataValidator(eventType);
      expect(validate).toBeDefined();
      const valid = validate!(event.data);
      if (!valid) {
        // eslint-disable-next-line no-console
        console.error(JSON.stringify(validate!.errors, null, 2));
      }
      expect(valid).toBe(true);
    },
  );

  describe('huecos conocidos del catálogo (sin schema todavía — ver docs/events/catalog.md)', () => {
    test.todo(`${documentedWithoutSchema.length} tipos documentados sin JSON Schema: ${documentedWithoutSchema.join(', ')}`);
  });
});
