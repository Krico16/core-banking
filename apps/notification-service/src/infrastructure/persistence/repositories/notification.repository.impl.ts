import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationRepository } from '../../../domain/ports/notification-repository.port';
import { NotificationOrmEntity } from '../entities/notification.orm-entity';
import { NotificationMapper } from '../mappers/notification.mapper';

@Injectable()
export class NotificationRepositoryImpl implements NotificationRepository {
  constructor(
    @InjectRepository(NotificationOrmEntity)
    private readonly ormRepo: Repository<NotificationOrmEntity>,
  ) {}

  async save(notification: Notification): Promise<void> {
    await this.ormRepo.save(NotificationMapper.toPersistence(notification));
  }

  async findBySubjectId(subjectId: string): Promise<Notification[]> {
    const orms = await this.ormRepo.find({ where: { subjectId }, order: { sentAt: 'DESC' } });
    return orms.map(NotificationMapper.toDomain);
  }
}
