import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { CustomersController } from './controllers/customers.controller';
import {
  RegisterCustomerUseCase, VerifyKycUseCase, SuspendCustomerUseCase,
  ReactivateCustomerUseCase, UpdateCustomerUseCase, GetCustomerUseCase,
} from '../application';

@Module({
  imports: [LoggerModule],
  controllers: [CustomersController],
  providers: [
    RegisterCustomerUseCase, VerifyKycUseCase, SuspendCustomerUseCase,
    ReactivateCustomerUseCase, UpdateCustomerUseCase, GetCustomerUseCase,
  ],
})
export class PresentationModule {}
