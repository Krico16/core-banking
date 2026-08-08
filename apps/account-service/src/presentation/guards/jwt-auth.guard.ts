import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly publicKey: string;

  constructor(private readonly configService: ConfigService) {
    const path = configService.getOrThrow<string>('jwt.publicKeyPath');
    this.publicKey = readFileSync(path, 'utf8');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
      const issuer = this.configService.get<string>('jwt.issuer') || 'banking-auth-service';
      const audience = this.configService.get<string>('jwt.audience') || 'banking-platform';

      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer,
        audience,
      }) as Record<string, unknown>;

      request.user = {
        userId: decoded.sub as string,
        email: decoded.email as string,
        roles: (decoded.roles as string[]) || [],
        scopes: (decoded.scopes as string[]) || [],
      };
      return true;
    } catch (err) {
      throw new UnauthorizedException(`Invalid token: ${(err as Error).message}`);
    }
  }
}
