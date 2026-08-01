import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaEventPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaEventPublisher.name);
  private producer: Producer | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const kafka = new Kafka({
      clientId: 'payment-service',
      brokers: (this.config.get<string>('REDPANDA_BROKERS') || 'localhost:19092').split(','),
    });

    this.producer = kafka.producer({ allowAutoTopicCreation: true });
    await this.producer.connect();
    this.logger.log('Kafka producer connected');
  }

  async onModuleDestroy() {
    if (this.producer) {
      await this.producer.disconnect();
    }
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
