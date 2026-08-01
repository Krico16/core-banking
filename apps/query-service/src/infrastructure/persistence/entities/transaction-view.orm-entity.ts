import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('transaction_views')
@Index(['entryId'])
@Index(['accountId'])
export class TransactionViewOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 26 })
  id: string;

  @Column({ type: 'varchar', length: 64, name: 'entry_id' })
  entryId: string;

  @Column({ type: 'varchar', length: 64, name: 'account_id' })
  accountId: string;

  @Column({ type: 'varchar', length: 64, name: 'counterpart_account_id', nullable: true })
  counterpartAccountId: string | null;

  @Column({ type: 'varchar', length: 10 })
  direction: string;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 20, name: 'entry_type' })
  entryType: string;

  @Column({ type: 'varchar', length: 20, default: 'POSTED' })
  status: string;

  @Column({ type: 'timestamptz', name: 'posted_at' })
  postedAt: Date;
}
