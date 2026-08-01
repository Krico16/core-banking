import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  privateKeyPath: process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem',
  publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem',
  accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m',
  refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
  issuer: process.env.JWT_ISSUER || 'banking-auth-service',
  audience: process.env.JWT_AUDIENCE || 'banking-platform',
}));
