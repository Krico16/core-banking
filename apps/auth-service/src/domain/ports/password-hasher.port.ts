import { Password, HashedPassword } from '../value-objects';

export interface PasswordHasher {
  hash(password: Password): Promise<HashedPassword>;
  verify(password: Password, hash: HashedPassword): Promise<boolean>;
}

export const PASSWORD_HASHER = 'PASSWORD_HASHER';
