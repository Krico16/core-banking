export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

export interface DecodedToken {
  sub: string;
  email?: string;
  roles: string[];
  scopes: string[];
  type: string;
}

export interface TokenVerifierPort {
  /**
   * Verifica firma, issuer, audience y expiración. Lanza InvalidTokenError si algo falla.
   */
  verify(token: string): DecodedToken;
}
