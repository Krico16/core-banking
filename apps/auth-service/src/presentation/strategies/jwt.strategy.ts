import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { UserId, USER_REPOSITORY, UserRepository } from '../../domain';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {
    const publicKeyPath = configService.getOrThrow<string>('jwt.publicKeyPath');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
    scopes: string[];
    type: string;
    jti: string;
  }) {
    const userId = UserId.create(payload.sub);
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive()) {
      throw new UnauthorizedException('Account is not active');
    }

    if (user.isLocked()) {
      throw new UnauthorizedException('Account is locked');
    }

    return {
      userId: user.id.getValue(),
      email: user.email.getValue(),
      roles: user.roleNames,
      scopes: payload.scopes || [],
    };
  }
}
