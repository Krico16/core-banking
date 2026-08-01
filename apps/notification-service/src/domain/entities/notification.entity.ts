import { ulid } from 'ulidx';
import { NotificationChannel } from '../value-objects/notification-channel.vo';

export class Notification {
  private constructor(
    readonly id: string,
    readonly subjectId: string,
    readonly eventType: string,
    readonly channel: NotificationChannel,
    readonly message: string,
    readonly sentAt: Date,
  ) {}

  static create(props: {
    subjectId: string;
    eventType: string;
    channel: NotificationChannel;
    message: string;
  }): Notification {
    return new Notification(
      ulid(),
      props.subjectId,
      props.eventType,
      props.channel,
      props.message,
      new Date(),
    );
  }

  static reconstruct(props: {
    id: string;
    subjectId: string;
    eventType: string;
    channel: NotificationChannel;
    message: string;
    sentAt: Date;
  }): Notification {
    return new Notification(
      props.id,
      props.subjectId,
      props.eventType,
      props.channel,
      props.message,
      props.sentAt,
    );
  }
}
