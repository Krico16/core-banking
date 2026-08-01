import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import appConfig from './infrastructure/config/app.config';
import databaseConfig from './infrastructure/config/database.config';
import redpandaConfig from './infrastructure/config/redpanda.config';
import { loggerConfig } from './common/logger/logger.config';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { PresentationModule } from './presentation/presentation.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redpandaConfig],
      envFilePath: ['.env', '.env.local'],
    }),
    LoggerModule.forRoot(loggerConfig),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<ReturnType<typeof databaseConfig>>('database');
        return {
          type: 'postgres' as const,
          host: config?.host,
          port: config?.port,
          username: config?.username,
          password: config?.password,
          database: config?.database,
          entities: [__dirname + '/**/*.orm-entity{.ts,.js}'],
          synchronize: config?.synchronize,
          logging: config?.logging,
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsRun: config?.migrationsRun,
        };
      },
    }),
    TerminusModule,
    InfrastructureModule,
    PresentationModule,
    HealthModule,
  ],
})
export class AppModule {}
