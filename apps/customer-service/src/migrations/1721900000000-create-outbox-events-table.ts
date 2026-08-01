import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateOutboxEventsTable1721900000000 implements MigrationInterface {
  name = 'CreateOutboxEventsTable1721900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'outbox_events',
        columns: [
          { name: 'id', type: 'varchar', length: '26', isPrimary: true },
          { name: 'aggregate_id', type: 'varchar', length: '26', isNullable: false },
          { name: 'event_type', type: 'varchar', length: '100', isNullable: false },
          { name: 'payload', type: 'text', isNullable: false },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'PENDING'",
          },
          { name: 'retry_count', type: 'int', isNullable: false, default: 0 },
          { name: 'created_at', type: 'timestamptz', isNullable: false, default: 'now()' },
          { name: 'published_at', type: 'timestamptz', isNullable: true },
          { name: 'error', type: 'text', isNullable: true },
        ],
        indices: [
          { name: 'IDX_OUTBOX_EVENTS_STATUS_CREATED_AT', columnNames: ['status', 'created_at'] },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('outbox_events', true);
  }
}
