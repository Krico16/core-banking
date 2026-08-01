import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn,
  VersionColumn, Index, BeforeInsert
} from 'typeorm';
import { ulid } from 'ulidx';

@Entity('customers')
@Index(['userId'], { unique: true })
@Index(['email'])
export class CustomerOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 26 })
  id: string;

  @Column({ type: 'varchar', length: 26, name: 'user_id', unique: true })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName: string;

  @Column({ type: 'varchar', length: 100, name: 'phone_number', nullable: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  street: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 20, name: 'postal_code', nullable: true })
  postalCode: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: string;

  @Column({ type: 'varchar', length: 20, name: 'kyc_status', default: 'PENDING' })
  kycStatus: string;

  @Column({ type: 'varchar', length: 10, name: 'risk_level', default: 'LOW' })
  riskLevel: string;

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
