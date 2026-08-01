import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PasswordHasher, Password, HashedPassword } from '../../domain';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  constructor(
    private readonly pepper: string,
    private readonly argon2Params: {
      memory: number;
      iterations: number;
      parallelism: number;
      hashLength: number;
    },
  ) {}

  async hash(password: Password): Promise<HashedPassword> {
    const peppered = this.pepper
      ? `${password.getValue()}${this.pepper}`
      : password.getValue();

    const hash = await argon2.hash(peppered, {
      type: argon2.argon2id,
      memoryCost: this.argon2Params.memory,
      timeCost: this.argon2Params.iterations,
      parallelism: this.argon2Params.parallelism,
      hashLength: this.argon2Params.hashLength,
    });

    return HashedPassword.fromHash(hash);
  }

  async verify(password: Password, hash: HashedPassword): Promise<boolean> {
    const peppered = this.pepper
      ? `${password.getValue()}${this.pepper}`
      : password.getValue();

    try {
      return await argon2.verify(hash.toString(), peppered);
    } catch {
      return false;
    }
  }
}
