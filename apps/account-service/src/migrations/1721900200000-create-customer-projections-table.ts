import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCustomerProjectionsTable1721900200000 implements MigrationInterface {
  name = 'CreateCustomerProjectionsTable1721900200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'customer_projections',
        columns: [
          { name: 'customer_id', type: 'varchar', length: '26', isPrimary: true },
          { name: 'verified', type: 'boolean', isNullable: false, default: false },
          { name: 'updated_at', type: 'timestamptz', isNullable: false, default: 'now()' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('customer_projections', true);
  }
}
