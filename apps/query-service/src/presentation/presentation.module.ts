import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers/health.controller';
import { AccountsController } from './controllers/accounts.controller';
import { PaymentsController } from './controllers/payments.controller';
import { CustomersController } from './controllers/customers.controller';

@Module({
  imports: [LoggerModule, TerminusModule],
  controllers: [HealthController, AccountsController, PaymentsController, CustomersController],
})
export class PresentationModule {}
