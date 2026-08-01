import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('payment_views')
export class PaymentViewOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64, name: 'payment_id' })
  paymentId: string;

  @Column({ type: 'varchar', length: 64, name: 'source_account_id' })
  sourceAccountId: string;

  @Column({ type: 'varchar', length: 64, name: 'target_account_id' })
  targetAccountId: string;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 64, name: 'initiated_by' })
  initiatedBy: string;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ type: 'varchar', length: 64, name: 'ledger_entry_id', nullable: true })
  ledgerEntryId: string | null;

  @Column({ type: 'varchar', length: 500, name: 'failure_reason', nullable: true })
  failureReason: string | null;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'reversed_at', nullable: true })
  reversedAt: Date | null;
}
