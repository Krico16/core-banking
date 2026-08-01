import { Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import {
  PASSWORD_HASHER,
  TOKEN_SERVICE,
  USER_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
} from '../domain';
import { UserOrmEntity } from './persistence/typeorm/entities/user.orm-entity';
import { RefreshTokenOrmEntity } from './persistence/typeorm/entities/refresh-token.orm-entity';
import { UserRepositoryImpl } from './persistence/typeorm/repositories/user.repository.impl';
import { RefreshTokenRepositoryImpl } from './persistence/typeorm/repositories/refresh-token.repository.impl';
import { Argon2PasswordHasher } from './auth/argon2-password-hasher';
import { Rs256JwtTokenService } from './auth/rs256-jwt-token-service';

const providers: Provider[] = [
  {
    provide: PASSWORD_HASHER,
    useFactory: (configService: ConfigService): Argon2PasswordHasher => {
      const pepper = configService.get<string>('app.passwordPepper', '');
      const argon2Params = configService.get<{
        memory: number;
        iterations: number;
        parallelism: number;
        hashLength: number;
      }>('app.argon2', {
        memory: 65536,
        iterations: 3,
        parallelism: 4,
        hashLength: 32,
      });
      return new Argon2PasswordHasher(pepper, argon2Params);
    },
    inject: [ConfigService],
  },
  {
    provide: TOKEN_SERVICE,
    useFactory: (
      jwtService: JwtService,
      configService: ConfigService,
    ): Rs256JwtTokenService => {
      const config = {
        privateKeyPath: configService.getOrThrow<string>('jwt.privateKeyPath'),
        publicKeyPath: configService.getOrThrow<string>('jwt.publicKeyPath'),
        accessTokenExpiration: configService.get<string>(
          'jwt.accessTokenExpiration',
          '15m',
        ),
        refreshTokenExpiration: configService.get<string>(
          'jwt.refreshTokenExpiration',
          '7d',
        ),
        issuer: configService.get<string>('jwt.issuer', 'banking-auth-service'),
        audience: configService.get<string>(
          'jwt.audience',
          'banking-platform',
        ),
      };
      return new Rs256JwtTokenService(
        jwtService,
        config,
      );
    },
    inject: [JwtService, ConfigService],
  },
  {
    provide: USER_REPOSITORY,
    useClass: UserRepositoryImpl,
  },
  {
    provide: REFRESH_TOKEN_REPOSITORY,
    useClass: RefreshTokenRepositoryImpl,
  },
];

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([UserOrmEntity, RefreshTokenOrmEntity]),
  ],
  providers,
  exports: [
    PASSWORD_HASHER,
    TOKEN_SERVICE,
    USER_REPOSITORY,
    REFRESH_TOKEN_REPOSITORY,
  ],
})
export class InfrastructureModule {}
