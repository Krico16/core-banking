import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateProcessedEventsTable1721900100000 implements MigrationInterface {
  name = 'CreateProcessedEventsTable1721900100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'processed_events',
        columns: [
          { name: 'event_id', type: 'varchar', length: '64', isPrimary: true },
          { name: 'consumer_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'processed_at', type: 'timestamptz', isNullable: false, default: 'now()' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('processed_events', true);
  }
}
