import Ajv2020, { ValidateFunction } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// tests/contract/src/helpers -> tests/contract/src -> tests/contract -> tests -> repo root
const SCHEMA_ROOT = join(__dirname, '..', '..', '..', '..', 'contracts', 'json-schema');

function loadJson<T = Record<string, unknown>>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

interface EventSchema {
  title: string;
  [key: string]: unknown;
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const moneySchema = loadJson<EventSchema>(join(SCHEMA_ROOT, 'money.json'));
ajv.addSchema(moneySchema);

const envelopeSchema = loadJson<EventSchema>(join(SCHEMA_ROOT, 'event-envelope.json'));
export const validateEnvelope: ValidateFunction = ajv.compile(envelopeSchema);

const eventsDir = join(SCHEMA_ROOT, 'events');
const eventSchemasByType = new Map<string, EventSchema>();
for (const file of readdirSync(eventsDir)) {
  if (!file.endsWith('.json')) continue;
  const schema = loadJson<EventSchema>(join(eventsDir, file));
  eventSchemasByType.set(schema.title, schema);
}

export const knownEventTypes: string[] = [...eventSchemasByType.keys()].sort();

const dataValidators = new Map<string, ValidateFunction>();
export function getDataValidator(eventType: string): ValidateFunction | undefined {
  if (dataValidators.has(eventType)) return dataValidators.get(eventType);
  const schema = eventSchemasByType.get(eventType);
  if (!schema) return undefined;
  const validator = ajv.compile(schema);
  dataValidators.set(eventType, validator);
  return validator;
}
