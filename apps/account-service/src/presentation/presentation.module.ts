import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { TerminusModule } from '@nestjs/terminus';
import { AccountsController } from './controllers/accounts.controller';
import { HealthController } from './controllers/health.controller';
import {
  OpenAccountUseCase, FreezeAccountUseCase,
  UnfreezeAccountUseCase, GetAccountUseCase,
} from '../application';

@Module({
  imports: [LoggerModule, TerminusModule],
  controllers: [AccountsController, HealthController],
  providers: [
    OpenAccountUseCase, FreezeAccountUseCase,
    UnfreezeAccountUseCase, GetAccountUseCase,
  ],
})
export class PresentationModule {}
