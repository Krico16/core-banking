import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentView } from '../../../domain/entities/payment-view.entity';
import { PaymentViewRepository } from '../../../domain/ports/payment-view-repository.port';
import { PaymentViewOrmEntity } from '../entities/payment-view.orm-entity';
import { PaymentViewMapper } from '../mappers/payment-view.mapper';

@Injectable()
export class PaymentViewRepositoryImpl implements PaymentViewRepository {
  constructor(
    @InjectRepository(PaymentViewOrmEntity)
    private readonly ormRepo: Repository<PaymentViewOrmEntity>,
  ) {}

  async save(view: PaymentView): Promise<void> {
    await this.ormRepo.save(PaymentViewMapper.toPersistence(view));
  }

  async findById(paymentId: string): Promise<PaymentView | null> {
    const orm = await this.ormRepo.findOne({ where: { paymentId } });
    return orm ? PaymentViewMapper.toDomain(orm) : null;
  }
}
