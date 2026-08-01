import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TransactionRunner, TransactionContext } from '../../domain/ports/transaction-runner.port';

@Injectable()
export class TypeOrmTransactionRunner implements TransactionRunner {
  constructor(private readonly dataSource: DataSource) {}

  async run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const result = await work(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
