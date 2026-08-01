import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { TOKEN_VERIFIER, TokenVerifierPort } from './domain/ports/token-verifier.port';
import { createJwtAuthMiddleware } from './infrastructure/auth/jwt-auth.middleware';
import { createRateLimitMiddleware } from './infrastructure/rate-limit/rate-limit.middleware';
import { createProxyMiddlewares } from './infrastructure/proxy/proxy.middleware';
import { ProxyRouteConfig } from './infrastructure/config/routes.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3009);
  const corsOrigin = configService.get<string | boolean>('app.corsOrigin', true);

  app.use(helmet());
  app.use(compression());
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.setGlobalPrefix('api');

  const rateLimitOptions = configService.get<{ windowMs: number; max: number }>('rateLimit');
  app.use(createRateLimitMiddleware(rateLimitOptions!));

  const tokenVerifier = app.get<TokenVerifierPort>(TOKEN_VERIFIER);
  app.use(createJwtAuthMiddleware(tokenVerifier));

  const routes = configService.get<ProxyRouteConfig[]>('routes', []);
  for (const { prefix, middleware } of createProxyMiddlewares(routes)) {
    app.use(prefix, middleware);
  }

  await app.listen(port);
  console.log(`API Gateway running on port ${port}`);
}

bootstrap();
