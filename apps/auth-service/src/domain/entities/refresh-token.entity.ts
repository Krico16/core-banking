import { TokenId } from '../value-objects';

export class RefreshToken {
  private constructor(
    readonly id: TokenId,
    readonly userId: string,
    readonly tokenHash: string,
    readonly expiresAt: Date,
    private _revokedAt: Date | null,
    private _replacedByTokenId: string | null,
    readonly ipAddress: string | null,
    readonly userAgent: string | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static create(params: {
    id: TokenId;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): RefreshToken {
    const now = new Date();
    return new RefreshToken(
      params.id,
      params.userId,
      params.tokenHash,
      params.expiresAt,
      null,
      null,
      params.ipAddress ?? null,
      params.userAgent ?? null,
      now,
      now,
    );
  }

  static reconstruct(params: {
    id: TokenId;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
    replacedByTokenId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): RefreshToken {
    return new RefreshToken(
      params.id,
      params.userId,
      params.tokenHash,
      params.expiresAt,
      params.revokedAt,
      params.replacedByTokenId,
      params.ipAddress,
      params.userAgent,
      params.createdAt,
      params.updatedAt,
    );
  }

  get revokedAt(): Date | null {
    return this._revokedAt;
  }

  get replacedByTokenId(): string | null {
    return this._replacedByTokenId;
  }

  isExpired(): boolean {
    return this.expiresAt <= new Date();
  }

  isRevoked(): boolean {
    return this._revokedAt !== null || this.isExpired();
  }

  isValid(): boolean {
    return !this.isRevoked() && !this.isExpired();
  }

  revoke(replacedByTokenId?: string): void {
    this._revokedAt = new Date();
    if (replacedByTokenId) {
      this._replacedByTokenId = replacedByTokenId;
    }
  }
}
