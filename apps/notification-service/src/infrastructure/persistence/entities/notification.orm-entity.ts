import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('notifications')
@Index(['subjectId'])
export class NotificationOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 26 })
  id: string;

  @Column({ type: 'varchar', length: 64, name: 'subject_id' })
  subjectId: string;

  @Column({ type: 'varchar', length: 100, name: 'event_type' })
  eventType: string;

  @Column({ type: 'varchar', length: 20 })
  channel: string;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'sent_at' })
  sentAt: Date;
}
