import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer } from 'kafkajs';
import { ProcessedEventOrmEntity } from '../persistence/entities/processed-event.orm-entity';
import { RecordCustomerRegisteredUseCase } from '../../application/use-cases/record-customer-registered.use-case';

interface IncomingEvent {
  eventId?: string;
  eventType?: string;
  data?: Record<string, unknown>;
}

/** Consume banking.customer.events: alimenta CustomerDashboard en CustomerRegistered,
 * ignora el resto (CustomerVerified, CustomerSuspended, CustomerContactUpdated —
 * fuera del alcance de las 4 proyecciones actuales). */
@Injectable()
export class CustomerEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CustomerEventConsumer.name);
  private static readonly CONSUMER_NAME = 'query-service-customer';
  private consumer: Consumer | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly processedRepo: Repository<ProcessedEventOrmEntity>,
    private readonly recordCustomerRegistered: RecordCustomerRegisteredUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokers = this.config.get<string[]>('redpanda.brokers') || ['localhost:19092'];
    const kafka = new Kafka({ brokers, clientId: 'query-service' });
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
    if (event.eventType !== 'CustomerRegistered' || !event.data) return;

    const already = await this.processedRepo.findOne({ where: { eventId } });
    if (already) return;

    const data = event.data;
    await this.recordCustomerRegistered.execute({
      customerId: data.customerId as string,
      email: data.email as string,
      firstName: (data.firstName as string) || '',
      lastName: (data.lastName as string) || '',
      country: (data.country as string) || '',
    });

    await this.processedRepo.save(
      this.processedRepo.create({ eventId, consumerName: CustomerEventConsumer.CONSUMER_NAME }),
    );
  }
}
