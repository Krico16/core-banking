import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCustomerDashboardsTable1721900900000 implements MigrationInterface {
  name = 'CreateCustomerDashboardsTable1721900900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'customer_dashboards',
        columns: [
          { name: 'customer_id', type: 'varchar', length: '64', isPrimary: true },
          { name: 'email', type: 'varchar', length: '255', isNullable: false },
          { name: 'first_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'last_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'country', type: 'varchar', length: '2', isNullable: false },
          { name: 'account_count', type: 'int', isNullable: false, default: 0 },
          { name: 'updated_at', type: 'timestamptz', isNullable: false, default: 'now()' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('customer_dashboards', true);
  }
}
