import { validateEnvelope } from './helpers/schema-registry';
import { loadCapturedEvents } from './fixtures/captured-events';
import { syntheticEvents } from './fixtures/synthetic-events';

describe('Envelope de eventos (contracts/json-schema/event-envelope.json)', () => {
  const captured = loadCapturedEvents();
  const allEvents = [...captured, ...syntheticEvents];

  if (captured.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      '[contract] No hay eventos capturados en tests/end-to-end/captured-events/latest.json — ' +
        'corré la suite E2E primero (npm test en tests/end-to-end) para validar contra tráfico real. ' +
        'Esta corrida solo valida las fixtures sintéticas.',
    );
  }

  test('hay al menos un evento para validar (real o sintético)', () => {
    expect(allEvents.length).toBeGreaterThan(0);
  });

  test.each(allEvents.map((event) => [event.eventType, event] as const))(
    '%s respeta el envelope estándar',
    (_eventType, event) => {
      const valid = validateEnvelope(event);
      if (!valid) {
        // eslint-disable-next-line no-console
        console.error(JSON.stringify(validateEnvelope.errors, null, 2));
      }
      expect(valid).toBe(true);
    },
  );
});
