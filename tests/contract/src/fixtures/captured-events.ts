import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { EnvelopeFixture } from './synthetic-events';

// tests/contract/src/fixtures -> tests/contract/src -> tests/contract -> tests -> end-to-end/captured-events
const CAPTURED_PATH = join(__dirname, '..', '..', '..', 'end-to-end', 'captured-events', 'latest.json');

interface CapturedRecord {
  topic: string;
  value: EnvelopeFixture;
}

/**
 * Eventos reales publicados por la última corrida de tests/end-to-end (ver
 * EventCapture ahí). Si nunca se corrió el E2E, vuelve vacío — no es un error,
 * pero los tests que dependen de fixtures reales lo saltan explícitamente en
 * vez de fingir cobertura con datos inventados.
 */
export function loadCapturedEvents(): EnvelopeFixture[] {
  if (!existsSync(CAPTURED_PATH)) return [];
  const raw = JSON.parse(readFileSync(CAPTURED_PATH, 'utf8')) as CapturedRecord[];
  return raw.map((record) => record.value);
}
