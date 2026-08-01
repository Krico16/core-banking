import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * Local read-model of customer verification status, built from CustomerRegistered/
 * CustomerVerified events (never reads customer-service's DB directly — regla nº6 AGENTS.md).
 */
@Entity('customer_projections')
export class CustomerProjectionOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 26, name: 'customer_id' })
  customerId: string;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
