import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { InfrastructureModule } from '../infrastructure';
import {
  RegisterUseCase,
  LoginUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
  GetProfileUseCase,
} from './use-cases';

const useCases = [
  RegisterUseCase,
  LoginUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
  GetProfileUseCase,
];

@Module({
  imports: [LoggerModule, InfrastructureModule],
  providers: useCases,
  exports: [...useCases, InfrastructureModule],
})
export class ApplicationModule {}
