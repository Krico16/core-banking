import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PresentationModule } from './presentation/presentation.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { PaymentOrmEntity } from './infrastructure/persistence/entities/payment.orm-entity';
import { ProcessedEventOrmEntity } from './infrastructure/persistence/entities/processed-event.orm-entity';
import { OutboxEventOrmEntity } from './infrastructure/persistence/entities/outbox-event.orm-entity';
import databaseConfig from './infrastructure/config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
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
          entities: [PaymentOrmEntity, ProcessedEventOrmEntity, OutboxEventOrmEntity],
          synchronize: config?.synchronize,
          logging: config?.logging,
          migrations: config?.migrations,
          migrationsRun: config?.migrationsRun,
        };
      },
    }),
    InfrastructureModule,
    PresentationModule,
  ],
})
export class AppModule {}
