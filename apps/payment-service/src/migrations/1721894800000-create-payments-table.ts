import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentsTable1721894800000 implements MigrationInterface {
  name = 'CreatePaymentsTable1721894800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE payments (
        id VARCHAR(64) PRIMARY KEY,
        idempotency_key VARCHAR(255) NOT NULL UNIQUE,
        source_account_id VARCHAR(64) NOT NULL,
        target_account_id VARCHAR(64) NOT NULL,
        amount_cents BIGINT NOT NULL,
        amount_currency VARCHAR(3) NOT NULL,
        description VARCHAR(500),
        initiated_by VARCHAR(64) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'CREATED',
        ledger_entry_id VARCHAR(64),
        failure_reason VARCHAR(500),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        reversed_at TIMESTAMP WITH TIME ZONE
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_payments_idempotency_key ON payments(idempotency_key)`);
    await queryRunner.query(`CREATE INDEX idx_payments_status ON payments(status)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE payments`);
  }
}
