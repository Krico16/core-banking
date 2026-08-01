import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer } from 'kafkajs';
import { ProcessedEventOrmEntity } from '../persistence/entities/processed-event.orm-entity';
import { RecordAccountOpenedUseCase } from '../../application/use-cases/record-account-opened.use-case';

interface IncomingEvent {
  eventId?: string;
  eventType?: string;
  data?: Record<string, unknown>;
}

/** Consume banking.account.events: alimenta AccountView + CustomerDashboard.accountCount
 * en AccountOpened, ignora el resto (AccountFrozen, AccountClosed). */
@Injectable()
export class AccountEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccountEventConsumer.name);
  private static readonly CONSUMER_NAME = 'query-service-account';
  private consumer: Consumer | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly processedRepo: Repository<ProcessedEventOrmEntity>,
    private readonly recordAccountOpened: RecordAccountOpenedUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokers = this.config.get<string[]>('redpanda.brokers') || ['localhost:19092'];
    const kafka = new Kafka({ brokers, clientId: 'query-service' });
    this.consumer = kafka.consumer({ groupId: AccountEventConsumer.CONSUMER_NAME });

    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: this.config.get<string>('redpanda.topicAccountEvents') || 'banking.account.events',
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}') as IncomingEvent;
          await this.handleIdempotent(event);
        } catch (err) {
          this.logger.error({ err }, 'Error processing account event');
        }
      },
    });

    this.logger.log('Subscribed to banking.account.events');
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
    if (event.eventType !== 'AccountOpened' || !event.data) return;

    const already = await this.processedRepo.findOne({ where: { eventId } });
    if (already) return;

    const data = event.data;
    await this.recordAccountOpened.execute({
      accountId: data.accountId as string,
      customerId: data.customerId as string,
      accountNumber: data.accountNumber as string,
      accountType: data.accountType as string,
      currency: data.currency as string,
    });

    await this.processedRepo.save(
      this.processedRepo.create({ eventId, consumerName: AccountEventConsumer.CONSUMER_NAME }),
    );
  }
}
