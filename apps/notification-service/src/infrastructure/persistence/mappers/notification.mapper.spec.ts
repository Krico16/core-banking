import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationChannel } from '../../../domain/value-objects/notification-channel.vo';
import { NotificationMapper } from './notification.mapper';

describe('NotificationMapper', () => {
  it('round-trips domain -> persistence -> domain without loss', () => {
    const original = Notification.create({
      subjectId: 'cust_1',
      eventType: 'CustomerSuspended',
      channel: NotificationChannel.LOG,
      message: 'Your account access has been suspended: FRAUD',
    });

    const orm = NotificationMapper.toPersistence(original);
    const restored = NotificationMapper.toDomain(orm);

    expect(restored).toEqual(original);
  });
});
