import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const BROKERS = (process.env.REDPANDA_BROKERS_HOST || 'localhost:19092').split(',');

const TOPICS = [
  'banking.customer.events',
  'banking.account.events',
  'banking.ledger.events',
  'banking.payment.events',
  'banking.payment.risk-requests',
  'banking.risk.events',
];

export interface CapturedEvent {
  topic: string;
  key: string | null;
  value: unknown;
  headers: Record<string, string>;
}

/**
 * Consumidor efímero (grupo nuevo por corrida, sin fromBeginning) que solo ve
 * eventos publicados DESPUÉS de arrancar — captura el tráfico real de una
 * corrida del flujo crítico para reutilizarlo como fixture en tests/contract/.
 * Si Kafka no está alcanzable (corriendo la suite fuera del stack), falla en
 * silencio: la captura es una ayuda para Etapa 3, no una aserción de Etapa 2.
 */
export class EventCapture {
  private readonly kafka = new Kafka({ clientId: 'e2e-event-capture', brokers: BROKERS });
  private consumer: Consumer | null = null;
  private readonly events: CapturedEvent[] = [];

  async start(): Promise<void> {
    try {
      this.consumer = this.kafka.consumer({ groupId: `e2e-capture-${Date.now()}` });
      await this.consumer.connect();
      await this.consumer.subscribe({ topics: TOPICS, fromBeginning: false });
      await this.consumer.run({
        eachMessage: async ({ topic, message }: EachMessagePayload) => {
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(message.headers ?? {})) {
            if (value) headers[key] = value.toString();
          }
          let parsedValue: unknown = null;
          try {
            parsedValue = message.value ? JSON.parse(message.value.toString()) : null;
          } catch {
            parsedValue = message.value?.toString() ?? null;
          }
          this.events.push({ topic, key: message.key?.toString() ?? null, value: parsedValue, headers });
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[EventCapture] no se pudo conectar a Kafka (${BROKERS.join(',')}), se omite la captura:`, err);
      this.consumer = null;
    }
  }

  async stop(): Promise<void> {
    if (this.consumer) {
      await this.consumer.disconnect();
    }
  }

  getEvents(): CapturedEvent[] {
    return this.events;
  }

  saveTo(relativeDir: string, fileName = 'latest.json'): void {
    if (this.events.length === 0) return;
    const dir = join(__dirname, '..', '..', relativeDir);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, fileName), JSON.stringify(this.events, null, 2));
  }
}
