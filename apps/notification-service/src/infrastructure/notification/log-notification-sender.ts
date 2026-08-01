import { Injectable, Logger } from '@nestjs/common';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationSender } from '../../domain/ports/notification-sender.port';

/** Único canal del MVP (regla nº1 de docs/ROADMAP.md 7.2: empezar simple antes de
 * multiplexar SMS/push). "Envía" logueando de forma estructurada — simula el envío
 * real per docs/architecture/bounded-contexts.md ("Enviar por canal preferido, simulado"). */
@Injectable()
export class LogNotificationSender implements NotificationSender {
  private readonly logger = new Logger(LogNotificationSender.name);

  async send(notification: Notification): Promise<void> {
    this.logger.log({
      notificationId: notification.id,
      subjectId: notification.subjectId,
      eventType: notification.eventType,
      channel: notification.channel,
      message: notification.message,
    });
  }
}
