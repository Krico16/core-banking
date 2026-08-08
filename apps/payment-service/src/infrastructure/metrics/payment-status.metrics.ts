import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gauge, Registry } from 'prom-client';
import { PaymentOrmEntity } from '../persistence/entities/payment.orm-entity';

export const paymentsRegistry = new Registry();

const paymentsByStatus = new Gauge({
  name: 'banking_payments_by_status',
  help: 'Current count of payments grouped by status',
  labelNames: ['status'],
  registers: [paymentsRegistry],
});

@Injectable()
export class PaymentStatusMetrics {
  constructor(
    @InjectRepository(PaymentOrmEntity)
    private readonly repository: Repository<PaymentOrmEntity>,
  ) {}

  @Interval(15000)
  async refresh(): Promise<void> {
    const rows: Array<{ status: string; count: string }> = await this.repository
      .createQueryBuilder('payment')
      .select('payment.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('payment.status')
      .getRawMany();

    paymentsByStatus.reset();
    for (const row of rows) {
      paymentsByStatus.set({ status: row.status }, Number(row.count));
    }
  }
}
