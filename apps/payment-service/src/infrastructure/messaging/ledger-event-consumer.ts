import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ProcessedEventOrmEntity } from '../persistence/entities/processed-event.orm-entity';
import { PaymentSagaOrchestrator } from '../../application/saga/payment-saga.orchestrator';

/**
 * Consume eventos del ledger para reconciliar el estado de los pagos.
 *
 * Idempotente (regla 4 AGENTS.md): cada event_id procesado se registra
 * en processed_events; los duplicados se descartan.
 *
 * Nota: el camino principal de la saga es síncrono (PaymentSagaOrchestrator
 * llama al ledger por HTTP). Este consumidor es la red de seguridad para
 * eventos externos (reversiones manuales, rechazos del ledger).
 */
@Injectable()
export class LedgerEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LedgerEventConsumer.name);
  private static readonly CONSUMER_NAME = 'payment-service-ledger';
  private consumer: Consumer | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly processedRepo: Repository<ProcessedEventOrmEntity>,
    private readonly saga: PaymentSagaOrchestrator,
  ) {}

  async onModuleInit() {
    const kafka = new Kafka({
      clientId: 'payment-service',
      brokers: (
        this.config.get<string>('REDPANDA_BROKERS') || 'localhost:19092'
      ).split(','),
    });

    this.consumer = kafka.consumer({ groupId: LedgerEventConsumer.CONSUMER_NAME });

    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: this.config.get<string>('LEDGER_EVENTS_TOPIC', 'banking.ledger.events'),
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          await this.handleIdempotent(event);
        } catch (err) {
          this.logger.error('Error processing ledger event', err);
        }
      },
    });

    this.logger.log('Subscribed to banking.ledger.events');
  }

  async onModuleDestroy() {
    if (this.consumer) {
      await this.consumer.disconnect();
    }
  }

  private async handleIdempotent(event: {
    eventId?: string;
    eventType?: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    const eventId = event.eventId;
    if (!eventId) {
      this.logger.warn('Event without eventId, skipping');
      return;
    }

    const already = await this.processedRepo.findOne({
      where: { eventId },
    });
    if (already) {
      this.logger.debug(`Event ${eventId} already processed, skipping`);
      return;
    }

    await this.handleEvent(event);

    await this.processedRepo.save(
      this.processedRepo.create({
        eventId,
        consumerName: LedgerEventConsumer.CONSUMER_NAME,
      }),
    );
  }

  private async handleEvent(event: {
    eventType?: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    const { eventType, data } = event;
    if (!data) return;

    // Reversión iniciada fuera del flujo del pago (p.ej. operaciones manuales)
    if (eventType === 'LedgerTransactionReversed') {
      const paymentId = data.paymentId as string | undefined;
      if (!paymentId) return;
      this.logger.log(
        `Ledger reversal observed for payment ${paymentId}; current saga state is source of truth`,
      );
    }

    if (eventType === 'LedgerTransactionRejected') {
      const paymentId = data.paymentId as string | undefined;
      if (!paymentId) return;
      this.logger.warn(`Ledger rejected posting for payment ${paymentId}`);
    }
  }
}
