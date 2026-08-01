import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTransactionViewsTable1721900700000 implements MigrationInterface {
  name = 'CreateTransactionViewsTable1721900700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'transaction_views',
        columns: [
          { name: 'id', type: 'varchar', length: '26', isPrimary: true },
          { name: 'entry_id', type: 'varchar', length: '64', isNullable: false },
          { name: 'account_id', type: 'varchar', length: '64', isNullable: false },
          { name: 'counterpart_account_id', type: 'varchar', length: '64', isNullable: true },
          { name: 'direction', type: 'varchar', length: '10', isNullable: false },
          { name: 'amount', type: 'bigint', isNullable: false },
          { name: 'currency', type: 'varchar', length: '3', isNullable: false },
          { name: 'entry_type', type: 'varchar', length: '20', isNullable: false },
          { name: 'status', type: 'varchar', length: '20', isNullable: false, default: "'POSTED'" },
          { name: 'posted_at', type: 'timestamptz', isNullable: false },
        ],
        indices: [
          { name: 'IDX_TRANSACTION_VIEWS_ENTRY_ID', columnNames: ['entry_id'] },
          { name: 'IDX_TRANSACTION_VIEWS_ACCOUNT_ID', columnNames: ['account_id'] },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('transaction_views', true);
  }
}
