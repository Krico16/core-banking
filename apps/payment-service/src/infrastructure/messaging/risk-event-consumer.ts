import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ProcessedEventOrmEntity } from '../persistence/entities/processed-event.orm-entity';
import { PaymentSagaOrchestrator } from '../../application/saga/payment-saga.orchestrator';

/**
 * Consume la respuesta async de risk-service (PaymentApprovedByRisk /
 * PaymentRejectedByRisk) y reanuda el saga desde RISK_REVIEW.
 *
 * Idempotente (regla nº4 AGENTS.md): cada event_id procesado se registra en
 * processed_events (misma tabla que LedgerEventConsumer); los duplicados se descartan.
 */
@Injectable()
export class RiskEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RiskEventConsumer.name);
  private static readonly CONSUMER_NAME = 'payment-service-risk';
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

    this.consumer = kafka.consumer({ groupId: RiskEventConsumer.CONSUMER_NAME });

    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: this.config.get<string>('RISK_EVENTS_TOPIC', 'banking.risk.events'),
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          await this.handleIdempotent(event);
        } catch (err) {
          this.logger.error('Error processing risk event', err);
        }
      },
    });

    this.logger.log('Subscribed to banking.risk.events');
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
        consumerName: RiskEventConsumer.CONSUMER_NAME,
      }),
    );
  }

  private async handleEvent(event: {
    eventType?: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    const { eventType, data } = event;
    if (!data) return;

    const paymentId = data.paymentId as string | undefined;
    if (!paymentId) return;

    if (eventType === 'PaymentApprovedByRisk') {
      await this.saga.resumeAfterRiskApproval(paymentId);
    }

    if (eventType === 'PaymentRejectedByRisk') {
      const reason = (data.reason as string | undefined) || 'RISK_REJECTED';
      await this.saga.handleRiskRejection(paymentId, reason);
    }
  }
}
