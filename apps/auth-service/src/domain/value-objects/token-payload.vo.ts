export class TokenPayload {
  private constructor(
    readonly sub: string,
    readonly email: string,
    readonly roles: string[],
    readonly scopes: string[],
    readonly type: 'access' | 'refresh',
    readonly jti: string,
    readonly iat: number,
    readonly exp: number,
    readonly iss: string,
    readonly aud: string,
  ) {}

  static fromJwtPayload(payload: {
    sub: string;
    email: string;
    roles: string[];
    scopes: string[];
    type: 'access' | 'refresh';
    jti: string;
    iat: number;
    exp: number;
    iss: string;
    aud: string;
  }): TokenPayload {
    return new TokenPayload(
      payload.sub,
      payload.email,
      payload.roles,
      payload.scopes,
      payload.type,
      payload.jti,
      payload.iat,
      payload.exp,
      payload.iss,
      payload.aud,
    );
  }

  get userId(): string {
    return this.sub;
  }

  get tokenId(): string {
    return this.jti;
  }

  isAccessToken(): boolean {
    return this.type === 'access';
  }

  isRefreshToken(): boolean {
    return this.type === 'refresh';
  }
}
