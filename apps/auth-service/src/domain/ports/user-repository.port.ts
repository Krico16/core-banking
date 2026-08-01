import { User } from '../entities';
import { UserId, Email } from '../value-objects';

export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
}

export const USER_REPOSITORY = 'USER_REPOSITORY';
