import { Notification } from '../entities/notification.entity';

export interface NotificationRepository {
  save(notification: Notification): Promise<void>;
  findBySubjectId(subjectId: string): Promise<Notification[]>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
