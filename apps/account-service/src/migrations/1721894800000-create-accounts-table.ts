import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAccountsTable1721894800000 implements MigrationInterface {
  name = 'CreateAccountsTable1721894800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'accounts',
        columns: [
          { name: 'id', type: 'varchar', length: '26', isPrimary: true },
          { name: 'customer_id', type: 'varchar', length: '26', isNullable: false },
          { name: 'account_number', type: 'varchar', length: '20', isNullable: false, isUnique: true },
          { name: 'account_type', type: 'varchar', length: '20', isNullable: false },
          { name: 'currency', type: 'varchar', length: '3', isNullable: false },
          { name: 'balance_amount', type: 'bigint', isNullable: false, default: 0 },
          { name: 'balance_currency', type: 'varchar', length: '3', isNullable: false },
          { name: 'status', type: 'varchar', length: '20', isNullable: false, default: "'ACTIVE'" },
          { name: 'daily_limit_amount', type: 'bigint', isNullable: false, default: 1000000 },
          { name: 'daily_limit_currency', type: 'varchar', length: '3', isNullable: false },
          { name: 'transaction_limit_amount', type: 'bigint', isNullable: false, default: 500000 },
          { name: 'transaction_limit_currency', type: 'varchar', length: '3', isNullable: false },
          { name: 'created_at', type: 'timestamptz', isNullable: false, default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', isNullable: false, default: 'now()' },
          { name: 'version', type: 'int', isNullable: false, default: 0 },
        ],
        indices: [
          { name: 'IDX_ACCOUNTS_CUSTOMER_ID', columnNames: ['customer_id'] },
          { name: 'IDX_ACCOUNTS_ACCOUNT_NUMBER', columnNames: ['account_number'], isUnique: true },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('accounts', true);
  }
}
