import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer } from 'kafkajs';
import { ProcessedEventOrmEntity } from '../persistence/entities/processed-event.orm-entity';
import { NotifyCustomerUseCase } from '../../application/use-cases/notify-customer.use-case';
import { buildNotificationMessage } from '../../application/services/notification-message-builder';

interface IncomingEvent {
  eventId?: string;
  eventType?: string;
  data?: Record<string, unknown>;
}

/** Consume banking.payment.events: notifica en PaymentCompleted/PaymentRejected,
 * ignora el resto (PaymentCreated, PaymentAuthorized, etc.). */
@Injectable()
export class PaymentEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentEventConsumer.name);
  private static readonly CONSUMER_NAME = 'notification-service-payment';
  private consumer: Consumer | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly processedRepo: Repository<ProcessedEventOrmEntity>,
    @Inject(NotifyCustomerUseCase) private readonly notifyCustomer: NotifyCustomerUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokers = this.config.get<string[]>('redpanda.brokers') || ['localhost:19092'];
    const kafka = new Kafka({ brokers, clientId: 'notification-service' });
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
    if (!event.data) return;

    const notification = buildNotificationMessage(event.eventType || '', event.data);
    if (!notification) return; // eventType que no notificamos — no hace falta idempotencia

    const already = await this.processedRepo.findOne({ where: { eventId } });
    if (already) return;

    await this.notifyCustomer.execute({
      subjectId: notification.subjectId,
      eventType: event.eventType as string,
      message: notification.message,
    });

    await this.processedRepo.save(
      this.processedRepo.create({ eventId, consumerName: PaymentEventConsumer.CONSUMER_NAME }),
    );
  }
}
