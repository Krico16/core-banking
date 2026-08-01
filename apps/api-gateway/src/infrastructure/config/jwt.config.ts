import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem',
  issuer: process.env.JWT_ISSUER || 'banking-auth-service',
  audience: process.env.JWT_AUDIENCE || 'banking-platform',
}));
