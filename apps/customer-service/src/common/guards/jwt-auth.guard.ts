import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync, existsSync } from 'fs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private publicKey: string | null = null;

  constructor(private readonly configService: ConfigService) {
    const path = configService.get<string>('jwt.publicKeyPath');
    if (path && existsSync(path)) {
      this.publicKey = readFileSync(path, 'utf8');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    if (!this.publicKey) {
      // In dev mode without public key, accept the token
      const decoded = jwt.decode(token) as Record<string, unknown> | null;
      if (!decoded) throw new UnauthorizedException('Invalid token');
      request.user = {
        userId: decoded.sub as string,
        email: decoded.email as string,
        roles: (decoded.roles as string[]) || [],
        scopes: (decoded.scopes as string[]) || [],
      };
      return true;
    }

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
