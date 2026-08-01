import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  passwordPepper: process.env.PASSWORD_PEPPER || '',
  argon2: {
    memory: parseInt(process.env.ARGON2_MEMORY || '65536', 10),
    iterations: parseInt(process.env.ARGON2_ITERATIONS || '3', 10),
    parallelism: parseInt(process.env.ARGON2_PARALLELISM || '4', 10),
    hashLength: parseInt(process.env.ARGON2_HASH_LENGTH || '32', 10),
  },
}));
