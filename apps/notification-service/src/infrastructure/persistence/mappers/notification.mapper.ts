import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationChannel } from '../../../domain/value-objects/notification-channel.vo';
import { NotificationOrmEntity } from '../entities/notification.orm-entity';

export class NotificationMapper {
  static toPersistence(notification: Notification): NotificationOrmEntity {
    const orm = new NotificationOrmEntity();
    orm.id = notification.id;
    orm.subjectId = notification.subjectId;
    orm.eventType = notification.eventType;
    orm.channel = notification.channel;
    orm.message = notification.message;
    orm.sentAt = notification.sentAt;
    return orm;
  }

  static toDomain(orm: NotificationOrmEntity): Notification {
    return Notification.reconstruct({
      id: orm.id,
      subjectId: orm.subjectId,
      eventType: orm.eventType,
      channel: orm.channel as NotificationChannel,
      message: orm.message,
      sentAt: orm.sentAt,
    });
  }
}
