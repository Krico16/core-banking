import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class KafkaEventPublisher implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {}

  async onModuleInit() {
    const brokers = this.config.get<string[]>('redpanda.brokers') || ['localhost:19092'];
    this.kafka = new Kafka({ brokers, clientId: 'account-service' });
    this.producer = this.kafka.producer({ allowAutoTopicCreation: true });
    await this.producer.connect();
    this.logger.info({ brokers }, 'Connected to Redpanda');
  }

  async onModuleDestroy() {
    if (this.producer) await this.producer.disconnect();
  }

  /** Sends a pre-serialized outbox payload as-is. Only the outbox worker calls this. */
  async sendRaw(topic: string, key: string, payload: string): Promise<void> {
    if (!this.producer) {
      throw new Error('Kafka producer not connected');
    }
    await this.producer.send({
      topic,
      messages: [{ key, value: payload }],
    });
  }
}
