import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAccountViewsTable1721900600000 implements MigrationInterface {
  name = 'CreateAccountViewsTable1721900600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'account_views',
        columns: [
          { name: 'account_id', type: 'varchar', length: '64', isPrimary: true },
          { name: 'customer_id', type: 'varchar', length: '64', isNullable: false },
          { name: 'account_number', type: 'varchar', length: '64', isNullable: false },
          { name: 'account_type', type: 'varchar', length: '20', isNullable: false },
          { name: 'currency', type: 'varchar', length: '3', isNullable: false },
          { name: 'balance', type: 'bigint', isNullable: false, default: 0 },
          { name: 'updated_at', type: 'timestamptz', isNullable: false, default: 'now()' },
        ],
        indices: [{ name: 'IDX_ACCOUNT_VIEWS_CUSTOMER_ID', columnNames: ['customer_id'] }],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('account_views', true);
  }
}
