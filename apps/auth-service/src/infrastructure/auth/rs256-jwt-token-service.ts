import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { readFileSync } from 'fs';
import { ulid } from 'ulidx';
import {
  TokenService,
  TokenPayload,
  Role,
  InvalidTokenException,
  roleToStringArray,
} from '../../domain';


@Injectable()
export class Rs256JwtTokenService implements TokenService {
  private readonly privateKey: string;
  private readonly publicKey: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: {
      privateKeyPath: string;
      publicKeyPath: string;
      accessTokenExpiration: string;
      refreshTokenExpiration: string;
      issuer: string;
      audience: string;
    },
  ) {
    this.privateKey = readFileSync(config.privateKeyPath, 'utf8');
    this.publicKey = readFileSync(config.publicKeyPath, 'utf8');
  }

  async generateAccessToken(params: {
    sub: string;
    email: string;
    roles: Role[];
  }): Promise<{ token: string; expiresIn: number }> {
    const expiresIn = this.config.accessTokenExpiration;
    const expirationSeconds = this.parseExpiration(expiresIn);

    const jwtPayload = {
      sub: params.sub,
      email: params.email,
      roles: roleToStringArray(params.roles),
      scopes: this.rolesToScopes(roleToStringArray(params.roles)),
      type: 'access' as const,
      jti: ulid(),
    };

    const token = this.jwtService.sign(jwtPayload, {
      privateKey: this.privateKey,
      algorithm: 'RS256',
      expiresIn,
      issuer: this.config.issuer,
      audience: this.config.audience,
    });

    return { token, expiresIn: expirationSeconds };
  }

  async generateRefreshToken(params: {
    sub: string;
    email: string;
  }): Promise<{ token: string; tokenId: string; expiresAt: Date }> {
    const expiresIn = this.config.refreshTokenExpiration;
    const tokenId = ulid();
    const expirationSeconds = this.parseExpiration(expiresIn);
    const expiresAt = new Date(Date.now() + expirationSeconds * 1000);

    const jwtPayload = {
      sub: params.sub,
      email: params.email,
      roles: [],
      scopes: [],
      type: 'refresh' as const,
      jti: tokenId,
    };

    const token = this.jwtService.sign(jwtPayload, {
      privateKey: this.privateKey,
      algorithm: 'RS256',
      expiresIn,
      issuer: this.config.issuer,
      audience: this.config.audience,
    });

    return { token, tokenId, expiresAt };
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = this.jwtService.verify(token, {
        publicKey: this.publicKey,
        algorithms: ['RS256'],
        issuer: this.config.issuer,
        audience: this.config.audience,
      });

      if (payload.type !== 'access') {
        throw new InvalidTokenException('Invalid token type');
      }

      return TokenPayload.fromJwtPayload(payload);
    } catch (error) {
      if (error instanceof InvalidTokenException) throw error;
      throw new InvalidTokenException('Invalid or expired access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const payload = this.jwtService.verify(token, {
        publicKey: this.publicKey,
        algorithms: ['RS256'],
        issuer: this.config.issuer,
        audience: this.config.audience,
      });

      if (payload.type !== 'refresh') {
        throw new InvalidTokenException('Invalid token type');
      }

      return TokenPayload.fromJwtPayload(payload);
    } catch (error) {
      if (error instanceof InvalidTokenException) throw error;
      throw new InvalidTokenException('Invalid or expired refresh token');
    }
  }

  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhdw])$/);
    if (!match) return 900;

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
      w: 604800,
    };

    return value * multipliers[unit];
  }

  private rolesToScopes(roles: string[]): string[] {
    const scopeMap: Record<string, string[]> = {
      customer: ['customer:read:self', 'customer:write:self'],
      support: ['customer:read', 'customer:write', 'account:read'],
      auditor: ['audit:read', 'customer:read', 'account:read'],
      'risk-analyst': ['risk:read', 'risk:write'],
      administrator: ['admin:full'],
      'service-account': ['service:internal'],
    };

    return roles.flatMap((role) => scopeMap[role] || []);
  }
}
