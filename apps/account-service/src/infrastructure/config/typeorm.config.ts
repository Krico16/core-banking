import { DataSource } from 'typeorm';
import databaseConfig from './database.config';

const config = databaseConfig();

export default new DataSource({
  type: 'postgres',
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  database: config.database,
  entities: config.entities,
  migrations: config.migrations,
  migrationsRun: config.migrationsRun,
  logging: config.logging,
  synchronize: false,
});
