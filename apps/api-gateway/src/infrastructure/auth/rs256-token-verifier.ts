import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import * as jwt from 'jsonwebtoken';
import { DecodedToken, TokenVerifierPort } from '../../domain/ports/token-verifier.port';
import { InvalidTokenError } from '../../domain/errors/invalid-token.error';

@Injectable()
export class Rs256TokenVerifier implements TokenVerifierPort {
  private readonly publicKey: string;
  private readonly issuer?: string;
  private readonly audience?: string;

  constructor(configService: ConfigService) {
    const publicKeyPath = configService.getOrThrow<string>('jwt.publicKeyPath');
    // Lectura fail-closed: si la clave no existe, el bootstrap lanza y el
    // proceso no levanta — nunca se cae a aceptar tokens sin verificar.
    this.publicKey = readFileSync(publicKeyPath, 'utf8');
    this.issuer = configService.get<string>('jwt.issuer');
    this.audience = configService.get<string>('jwt.audience');
  }

  verify(token: string): DecodedToken {
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: this.issuer,
        audience: this.audience,
      }) as jwt.JwtPayload;
    } catch (error) {
      throw new InvalidTokenError((error as Error).message);
    }

    if (typeof payload.sub !== 'string') {
      throw new InvalidTokenError('missing subject claim');
    }

    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      roles: Array.isArray(payload.roles) ? (payload.roles as string[]) : [],
      scopes: Array.isArray(payload.scopes) ? (payload.scopes as string[]) : [],
      type: typeof payload.type === 'string' ? payload.type : 'access',
    };
  }
}
