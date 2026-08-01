import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import appConfig from './infrastructure/config/app.config';
import jwtConfig from './infrastructure/config/jwt.config';
import rateLimitConfig from './infrastructure/config/rate-limit.config';
import routesConfig from './infrastructure/config/routes.config';
import { loggerConfig } from './common/logger/logger.config';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { PresentationModule } from './presentation/presentation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, rateLimitConfig, routesConfig],
      envFilePath: ['.env', '.env.local'],
    }),
    LoggerModule.forRoot(loggerConfig),
    TerminusModule,
    InfrastructureModule,
    PresentationModule,
  ],
})
export class AppModule {}
