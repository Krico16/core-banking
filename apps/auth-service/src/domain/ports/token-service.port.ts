import { TokenPayload, Role } from '../value-objects';

export interface TokenService {
  generateAccessToken(params: {
    sub: string;
    email: string;
    roles: Role[];
  }): Promise<{ token: string; expiresIn: number }>;

  generateRefreshToken(params: {
    sub: string;
    email: string;
  }): Promise<{ token: string; tokenId: string; expiresAt: Date }>;

  verifyAccessToken(token: string): Promise<TokenPayload>;
  verifyRefreshToken(token: string): Promise<TokenPayload>;
}

export const TOKEN_SERVICE = 'TOKEN_SERVICE';
