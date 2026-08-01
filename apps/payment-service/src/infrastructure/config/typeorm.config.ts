import { DataSource } from 'typeorm';
import databaseConfig from './database.config';
import { PaymentOrmEntity } from '../persistence/entities/payment.orm-entity';
import { ProcessedEventOrmEntity } from '../persistence/entities/processed-event.orm-entity';
import { OutboxEventOrmEntity } from '../persistence/entities/outbox-event.orm-entity';

const config = databaseConfig();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  database: config.database,
  entities: [PaymentOrmEntity, ProcessedEventOrmEntity, OutboxEventOrmEntity],
  migrations: config.migrations,
  migrationsRun: config.migrationsRun,
  logging: config.logging,
  synchronize: false,
});
