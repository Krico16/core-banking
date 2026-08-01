import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import { appConfig, databaseConfig, jwtConfig } from './infrastructure/config';
import { loggerConfig } from './common/logger/logger.config';
import { PresentationModule } from './presentation/presentation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      envFilePath: ['.env', '.env.local'],
    }),
    LoggerModule.forRoot(loggerConfig),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<ReturnType<typeof databaseConfig>>('database');
        return {
          type: 'postgres',
          host: config?.host,
          port: config?.port,
          username: config?.username,
          password: config?.password,
          database: config?.database,
          entities: [
            __dirname + '/infrastructure/persistence/typeorm/entities/*.orm-entity{.ts,.js}',
          ],
          synchronize: config?.synchronize,
          logging: config?.logging,
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsRun: config?.migrationsRun,
        };
      },
    }),
    TerminusModule,
    PresentationModule,
  ],
})
export class AppModule {}
