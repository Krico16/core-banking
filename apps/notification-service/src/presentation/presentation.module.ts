import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers/health.controller';
import { NotificationsController } from './controllers/notifications.controller';

@Module({
  imports: [LoggerModule, TerminusModule],
  controllers: [HealthController, NotificationsController],
})
export class PresentationModule {}
