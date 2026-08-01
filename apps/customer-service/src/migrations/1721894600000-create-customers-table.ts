import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCustomersTable1721894600000 implements MigrationInterface {
  name = 'CreateCustomersTable1721894600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'customers',
        columns: [
          { name: 'id', type: 'varchar', length: '26', isPrimary: true },
          { name: 'user_id', type: 'varchar', length: '26', isNullable: false, isUnique: true },
          { name: 'email', type: 'varchar', length: '255', isNullable: false },
          { name: 'first_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'last_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'phone_number', type: 'varchar', length: '100', isNullable: true },
          { name: 'street', type: 'varchar', length: '255', isNullable: true },
          { name: 'city', type: 'varchar', length: '100', isNullable: true },
          { name: 'country', type: 'varchar', length: '2', isNullable: true },
          { name: 'postal_code', type: 'varchar', length: '20', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', isNullable: false, default: "'PENDING'" },
          { name: 'kyc_status', type: 'varchar', length: '20', isNullable: false, default: "'PENDING'" },
          { name: 'risk_level', type: 'varchar', length: '10', isNullable: false, default: "'LOW'" },
          { name: 'created_at', type: 'timestamptz', isNullable: false, default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', isNullable: false, default: 'now()' },
          { name: 'version', type: 'int', isNullable: false, default: 0 },
        ],
        indices: [
          { name: 'IDX_CUSTOMERS_USER_ID', columnNames: ['user_id'], isUnique: true },
          { name: 'IDX_CUSTOMERS_EMAIL', columnNames: ['email'] },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('customers', true);
  }
}
