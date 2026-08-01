import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateNotificationsTable1721900400000 implements MigrationInterface {
  name = 'CreateNotificationsTable1721900400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          { name: 'id', type: 'varchar', length: '26', isPrimary: true },
          { name: 'subject_id', type: 'varchar', length: '64', isNullable: false },
          { name: 'event_type', type: 'varchar', length: '100', isNullable: false },
          { name: 'channel', type: 'varchar', length: '20', isNullable: false },
          { name: 'message', type: 'text', isNullable: false },
          { name: 'sent_at', type: 'timestamptz', isNullable: false, default: 'now()' },
        ],
        indices: [{ name: 'IDX_NOTIFICATIONS_SUBJECT_ID', columnNames: ['subject_id'] }],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notifications', true);
  }
}
