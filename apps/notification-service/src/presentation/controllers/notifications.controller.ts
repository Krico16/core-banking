import { Controller, Get, Inject, Param } from '@nestjs/common';
import {
  NotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../domain/ports/notification-repository.port';

interface NotificationResponse {
  id: string;
  subjectId: string;
  eventType: string;
  channel: string;
  message: string;
  sentAt: string;
}

/** Endpoint de solo lectura para verificar qué se notificó — no hay caso de uso
 * de escritura expuesto por HTTP, todo se dispara por eventos de Kafka. */
@Controller('notifications')
export class NotificationsController {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly repo: NotificationRepository) {}

  @Get(':subjectId')
  async bySubjectId(@Param('subjectId') subjectId: string): Promise<NotificationResponse[]> {
    const notifications = await this.repo.findBySubjectId(subjectId);
    return notifications.map((n) => ({
      id: n.id,
      subjectId: n.subjectId,
      eventType: n.eventType,
      channel: n.channel,
      message: n.message,
      sentAt: n.sentAt.toISOString(),
    }));
  }
}
