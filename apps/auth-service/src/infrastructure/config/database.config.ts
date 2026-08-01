import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'auth_db',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.DATABASE_LOGGING === 'true',
  entities: [__dirname + '/../**/typeorm/entities/*.orm-entity{.ts,.js}'],
  migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
  migrationsRun: process.env.DATABASE_MIGRATIONS_RUN === 'true',
}));
