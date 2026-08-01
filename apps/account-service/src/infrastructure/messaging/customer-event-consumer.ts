import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer } from 'kafkajs';
import { ProcessedEventOrmEntity } from '../persistence/entities/processed-event.orm-entity';
import {
  CustomerVerificationRepository,
  CUSTOMER_VERIFICATION_REPOSITORY,
} from '../../domain/ports/customer-verification-repository.port';

interface IncomingEvent {
  eventId?: string;
  eventType?: string;
  data?: Record<string, unknown>;
}

/**
 * Consume CustomerRegistered/CustomerVerified para mantener una proyección local
 * (customer_projections) de qué clientes están verificados. account-service nunca
 * lee la BD de customer-service directamente (regla nº6 AGENTS.md); esta proyección
 * es la única fuente que open-account.use-case usa para exigir KYC verificado.
 */
@Injectable()
export class CustomerEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CustomerEventConsumer.name);
  private static readonly CONSUMER_NAME = 'account-service-customer';
  private consumer: Consumer | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly processedRepo: Repository<ProcessedEventOrmEntity>,
    @Inject(CUSTOMER_VERIFICATION_REPOSITORY)
    private readonly verification: CustomerVerificationRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokers = this.config.get<string[]>('redpanda.brokers') || ['localhost:19092'];
    const kafka = new Kafka({ brokers, clientId: 'account-service' });
    this.consumer = kafka.consumer({ groupId: CustomerEventConsumer.CONSUMER_NAME });

    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: this.config.get<string>('redpanda.topicCustomerEvents') || 'banking.customer.events',
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}') as IncomingEvent;
          await this.handleIdempotent(event);
        } catch (err) {
          this.logger.error({ err }, 'Error processing customer event');
        }
      },
    });

    this.logger.log('Subscribed to banking.customer.events');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.consumer) await this.consumer.disconnect();
  }

  private async handleIdempotent(event: IncomingEvent): Promise<void> {
    const eventId = event.eventId;
    if (!eventId) {
      this.logger.warn('Event without eventId, skipping');
      return;
    }

    const already = await this.processedRepo.findOne({ where: { eventId } });
    if (already) {
      return;
    }

    await this.handleEvent(event);

    await this.processedRepo.save(
      this.processedRepo.create({ eventId, consumerName: CustomerEventConsumer.CONSUMER_NAME }),
    );
  }

  private async handleEvent(event: IncomingEvent): Promise<void> {
    const { eventType, data } = event;
    if (!data) return;

    const customerId = data.customerId as string | undefined;
    if (!customerId) return;

    if (eventType === 'CustomerRegistered') {
      await this.verification.upsert(customerId, false);
    }

    if (eventType === 'CustomerVerified') {
      await this.verification.upsert(customerId, true);
    }
  }
}
