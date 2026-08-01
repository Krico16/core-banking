import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer } from 'kafkajs';
import { ProcessedEventOrmEntity } from '../persistence/entities/processed-event.orm-entity';
import { UpsertPaymentViewUseCase } from '../../application/use-cases/upsert-payment-view.use-case';

interface IncomingEvent {
  eventId?: string;
  eventType?: string;
  data?: Record<string, unknown>;
}

/** Consume banking.payment.events. A diferencia de docs/architecture/bounded-contexts.md
 * (que solo lista Created/Completed/Rejected/Reversed como origen de PaymentView),
 * este consumidor actualiza la vista con los 6 tipos de evento de pago
 * (incluye Authorized y Failed): todos llevan el mismo snapshot completo del pago
 * (buildPaymentEventEnvelope), así que PaymentView siempre refleja el estado real
 * más reciente en vez de quedarse desactualizada mientras un pago está en curso. */
@Injectable()
export class PaymentEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentEventConsumer.name);
  private static readonly CONSUMER_NAME = 'query-service-payment';
  private static readonly RELEVANT_EVENT_TYPES = [
    'PaymentCreated',
    'PaymentAuthorized',
    'PaymentCompleted',
    'PaymentRejected',
    'PaymentFailed',
    'PaymentReversed',
  ];
  private consumer: Consumer | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly processedRepo: Repository<ProcessedEventOrmEntity>,
    private readonly upsertPaymentView: UpsertPaymentViewUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokers = this.config.get<string[]>('redpanda.brokers') || ['localhost:19092'];
    const kafka = new Kafka({ brokers, clientId: 'query-service' });
    this.consumer = kafka.consumer({ groupId: PaymentEventConsumer.CONSUMER_NAME });

    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: this.config.get<string>('redpanda.topicPaymentEvents') || 'banking.payment.events',
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}') as IncomingEvent;
          await this.handleIdempotent(event);
        } catch (err) {
          this.logger.error({ err }, 'Error processing payment event');
        }
      },
    });

    this.logger.log('Subscribed to banking.payment.events');
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
    if (!event.eventType || !PaymentEventConsumer.RELEVANT_EVENT_TYPES.includes(event.eventType)) {
      return;
    }
    if (!event.data) return;

    const already = await this.processedRepo.findOne({ where: { eventId } });
    if (already) return;

    const data = event.data;
    await this.upsertPaymentView.execute({
      paymentId: data.paymentId as string,
      sourceAccountId: data.sourceAccountId as string,
      targetAccountId: data.targetAccountId as string,
      amount: data.amount as number,
      currency: data.currency as string,
      description: (data.description as string) ?? null,
      initiatedBy: data.initiatedBy as string,
      status: data.status as string,
      ledgerEntryId: (data.ledgerEntryId as string) ?? null,
      failureReason: (data.failureReason as string) ?? null,
      createdAt: data.createdAt as string,
      updatedAt: data.updatedAt as string,
      completedAt: (data.completedAt as string) ?? null,
      reversedAt: (data.reversedAt as string) ?? null,
    });

    await this.processedRepo.save(
      this.processedRepo.create({ eventId, consumerName: PaymentEventConsumer.CONSUMER_NAME }),
    );
  }
}
