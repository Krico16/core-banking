export class InvalidTokenError extends Error {
  constructor(reason: string) {
    super(`Invalid token: ${reason}`);
    this.name = 'InvalidTokenError';
  }
}
