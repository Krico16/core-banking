import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('payments')
export class PaymentOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'idempotency_key', unique: true })
  @Index()
  idempotencyKey: string;

  @Column({ type: 'varchar', length: 64, name: 'source_account_id' })
  sourceAccountId: string;

  @Column({ type: 'varchar', length: 64, name: 'target_account_id' })
  targetAccountId: string;

  @Column({ type: 'bigint', name: 'amount_cents' })
  amountCents: number;

  @Column({ type: 'varchar', length: 3, name: 'amount_currency' })
  amountCurrency: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 64, name: 'initiated_by' })
  initiatedBy: string;

  @Column({ type: 'varchar', length: 20 })
  @Index()
  status: string;

  @Column({ type: 'varchar', length: 64, name: 'ledger_entry_id', nullable: true })
  ledgerEntryId?: string;

  @Column({ type: 'varchar', length: 500, name: 'failure_reason', nullable: true })
  failureReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamptz', name: 'reversed_at', nullable: true })
  reversedAt?: Date;
}
