import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('processed_events')
export class ProcessedEventOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64, name: 'event_id' })
  eventId: string;

  @Column({ type: 'varchar', length: 100, name: 'consumer_name' })
  consumerName: string;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt: Date;
}
