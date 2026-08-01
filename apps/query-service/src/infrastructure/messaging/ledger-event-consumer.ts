import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer } from 'kafkajs';
import { ProcessedEventOrmEntity } from '../persistence/entities/processed-event.orm-entity';
import { RecordLedgerTransactionUseCase } from '../../application/use-cases/record-ledger-transaction.use-case';
import { ReverseLedgerTransactionUseCase } from '../../application/use-cases/reverse-ledger-transaction.use-case';
import { UpdateAccountBalanceUseCase } from '../../application/use-cases/update-account-balance.use-case';
import { LedgerEntryLineInput } from '../../application/dto/ledger-entry-line.input';

interface IncomingEvent {
  eventId?: string;
  eventType?: string;
  data?: Record<string, unknown>;
}

/** Consume banking.ledger.events: alimenta TransactionView (posted/reversed) y
 * AccountView.balance (AccountBalanceChanged). Ignora LedgerTransactionRejected
 * (nada que proyectar — no hay journal entry detrás de un rechazo). */
@Injectable()
export class LedgerEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LedgerEventConsumer.name);
  private static readonly CONSUMER_NAME = 'query-service-ledger';
  private consumer: Consumer | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(ProcessedEventOrmEntity)
    private readonly processedRepo: Repository<ProcessedEventOrmEntity>,
    private readonly recordLedgerTransaction: RecordLedgerTransactionUseCase,
    private readonly reverseLedgerTransaction: ReverseLedgerTransactionUseCase,
    private readonly updateAccountBalance: UpdateAccountBalanceUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokers = this.config.get<string[]>('redpanda.brokers') || ['localhost:19092'];
    const kafka = new Kafka({ brokers, clientId: 'query-service' });
    this.consumer = kafka.consumer({ groupId: LedgerEventConsumer.CONSUMER_NAME });

    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: this.config.get<string>('redpanda.topicLedgerEvents') || 'banking.ledger.events',
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}') as IncomingEvent;
          await this.handleIdempotent(event);
        } catch (err) {
          this.logger.error({ err }, 'Error processing ledger event');
        }
      },
    });

    this.logger.log('Subscribed to banking.ledger.events');
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

    const relevant = [
      'LedgerTransactionPosted',
      'LedgerTransactionReversed',
      'AccountBalanceChanged',
    ];
    if (!event.eventType || !relevant.includes(event.eventType)) return;

    const already = await this.processedRepo.findOne({ where: { eventId } });
    if (already) return;

    await this.handleEvent(event.eventType, event.data);

    await this.processedRepo.save(
      this.processedRepo.create({ eventId, consumerName: LedgerEventConsumer.CONSUMER_NAME }),
    );
  }

  private async handleEvent(eventType: string, data: Record<string, unknown>): Promise<void> {
    if (eventType === 'LedgerTransactionPosted') {
      await this.recordLedgerTransaction.execute({
        entryId: data.entryId as string,
        entryType: data.entryType as string,
        postedAt: data.postedAt as string,
        entries: this.mapEntries(data.entries),
      });
      return;
    }

    if (eventType === 'LedgerTransactionReversed') {
      await this.reverseLedgerTransaction.execute({
        originalEntryId: data.originalEntryId as string,
        reversalEntryId: data.reversalEntryId as string,
        reversedAt: data.reversedAt as string,
        entries: this.mapEntries(data.entries),
      });
      return;
    }

    if (eventType === 'AccountBalanceChanged') {
      await this.updateAccountBalance.execute({
        accountId: data.accountId as string,
        newBalance: data.newBalance as number,
      });
    }
  }

  private mapEntries(raw: unknown): LedgerEntryLineInput[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((entry) => ({
      accountId: entry.accountId as string,
      type: entry.type as 'DEBIT' | 'CREDIT',
      amount: entry.amount as number,
      currency: entry.currency as string,
    }));
  }
}
