import { registerAs } from '@nestjs/config';

export default registerAs('rateLimit', () => ({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
}));
