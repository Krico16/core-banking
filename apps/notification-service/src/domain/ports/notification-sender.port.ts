import { Notification } from '../entities/notification.entity';

export interface NotificationSender {
  send(notification: Notification): Promise<void>;
}

export const NOTIFICATION_SENDER = Symbol('NOTIFICATION_SENDER');
