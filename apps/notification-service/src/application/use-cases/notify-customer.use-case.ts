import { Inject, Injectable } from '@nestjs/common';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationChannel } from '../../domain/value-objects/notification-channel.vo';
import {
  NotificationRepository,
  NOTIFICATION_REPOSITORY,
  NotificationSender,
  NOTIFICATION_SENDER,
} from '../../domain/ports';
import { NotifyCustomerInput } from '../dto/notify-customer.input';

@Injectable()
export class NotifyCustomerUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly repo: NotificationRepository,
    @Inject(NOTIFICATION_SENDER) private readonly sender: NotificationSender,
  ) {}

  async execute(input: NotifyCustomerInput): Promise<Notification> {
    const notification = Notification.create({
      subjectId: input.subjectId,
      eventType: input.eventType,
      channel: NotificationChannel.LOG,
      message: input.message,
    });

    await this.sender.send(notification);
    await this.repo.save(notification);

    return notification;
  }
}
