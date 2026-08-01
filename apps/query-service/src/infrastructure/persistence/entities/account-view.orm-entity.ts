import { Entity, PrimaryColumn, Column, UpdateDateColumn, Index } from 'typeorm';

@Entity('account_views')
@Index(['customerId'])
export class AccountViewOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64, name: 'account_id' })
  accountId: string;

  @Column({ type: 'varchar', length: 64, name: 'customer_id' })
  customerId: string;

  @Column({ type: 'varchar', length: 64, name: 'account_number' })
  accountNumber: string;

  @Column({ type: 'varchar', length: 20, name: 'account_type' })
  accountType: string;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'bigint' })
  balance: number;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
