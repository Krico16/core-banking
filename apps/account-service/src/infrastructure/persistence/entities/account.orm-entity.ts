import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn,
  VersionColumn, Index, BeforeInsert
} from 'typeorm';
import { ulid } from 'ulidx';

@Entity('accounts')
@Index(['customerId'])
@Index(['accountNumber'], { unique: true })
export class AccountOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 26 })
  id: string;

  @Column({ type: 'varchar', length: 26, name: 'customer_id' })
  customerId: string;

  @Column({ type: 'varchar', length: 20, name: 'account_number', unique: true })
  accountNumber: string;

  @Column({ type: 'varchar', length: 20, name: 'account_type' })
  accountType: string;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'bigint', default: 0 })
  balanceAmount: number;

  @Column({ type: 'varchar', length: 3, name: 'balance_currency' })
  balanceCurrency: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'bigint', name: 'daily_limit_amount', default: 1000000 })
  dailyLimitAmount: number;

  @Column({ type: 'varchar', length: 3, name: 'daily_limit_currency' })
  dailyLimitCurrency: string;

  @Column({ type: 'bigint', name: 'transaction_limit_amount', default: 500000 })
  transactionLimitAmount: number;

  @Column({ type: 'varchar', length: 3, name: 'transaction_limit_currency' })
  transactionLimitCurrency: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @VersionColumn({ type: 'int', name: 'version' })
  version: number;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = ulid();
  }
}
