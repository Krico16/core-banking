import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePaymentViewsTable1721900800000 implements MigrationInterface {
  name = 'CreatePaymentViewsTable1721900800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payment_views',
        columns: [
          { name: 'payment_id', type: 'varchar', length: '64', isPrimary: true },
          { name: 'source_account_id', type: 'varchar', length: '64', isNullable: false },
          { name: 'target_account_id', type: 'varchar', length: '64', isNullable: false },
          { name: 'amount', type: 'bigint', isNullable: false },
          { name: 'currency', type: 'varchar', length: '3', isNullable: false },
          { name: 'description', type: 'varchar', length: '500', isNullable: true },
          { name: 'initiated_by', type: 'varchar', length: '64', isNullable: false },
          { name: 'status', type: 'varchar', length: '20', isNullable: false },
          { name: 'ledger_entry_id', type: 'varchar', length: '64', isNullable: true },
          { name: 'failure_reason', type: 'varchar', length: '500', isNullable: true },
          { name: 'created_at', type: 'timestamptz', isNullable: false },
          { name: 'updated_at', type: 'timestamptz', isNullable: false },
          { name: 'completed_at', type: 'timestamptz', isNullable: true },
          { name: 'reversed_at', type: 'timestamptz', isNullable: true },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('payment_views', true);
  }
}
