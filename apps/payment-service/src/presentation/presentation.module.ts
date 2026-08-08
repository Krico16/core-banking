import { Module } from '@nestjs/common';
import { PaymentsController } from './controllers/payments.controller';
import { HealthController } from './controllers/health.controller';
import { MetricsController } from './controllers/metrics.controller';
import { ApplicationModule } from '../application/application.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule, ApplicationModule],
  controllers: [PaymentsController, HealthController, MetricsController],
})
export class PresentationModule {}
