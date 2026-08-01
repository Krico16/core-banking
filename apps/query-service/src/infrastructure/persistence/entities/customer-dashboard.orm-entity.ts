import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('customer_dashboards')
export class CustomerDashboardOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64, name: 'customer_id' })
  customerId: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName: string;

  @Column({ type: 'varchar', length: 2 })
  country: string;

  @Column({ type: 'int', name: 'account_count', default: 0 })
  accountCount: number;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
