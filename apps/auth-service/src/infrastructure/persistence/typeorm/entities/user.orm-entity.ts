import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ulid } from 'ulidx';

@Entity('users')
@Index(['email'], { unique: true })
export class UserOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 26 })
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 100, name: 'first_name', nullable: true })
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name', nullable: true })
  lastName: string;

  @Column({ type: 'simple-array', default: 'customer' })
  roles: string[];

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'boolean', name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ type: 'int', name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamptz', name: 'locked_until', nullable: true })
  lockedUntil: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @VersionColumn({ type: 'int', name: 'version' })
  version: number;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = ulid();
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }
}
