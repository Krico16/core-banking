import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    const publicKeyPath = configService.getOrThrow<string>('jwt.publicKeyPath');

    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: readFileSync(publicKeyPath),
      issuer: configService.get<string>('jwt.issuer'),
      audience: configService.get<string>('jwt.audience'),
      algorithms: ['RS256'],
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    roles: string[];
    type: string;
    jti: string;
  }) {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    return {
      userId: payload.sub,
      tokenId: payload.jti,
      email: payload.email,
      roles: payload.roles,
    };
  }
}
