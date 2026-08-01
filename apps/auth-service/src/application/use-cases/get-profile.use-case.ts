import { Injectable, Inject } from '@nestjs/common';
import {
  UserId,
  UserNotFoundException,
  UserRepository,
  USER_REPOSITORY,
} from '../../domain';

export interface UserProfileResult {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  status: string;
  createdAt: string;
}

@Injectable()
export class GetProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string): Promise<UserProfileResult> {
    const id = UserId.create(userId);
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    const plain = user.toPlain();
    return {
      userId: plain.id as string,
      email: plain.email as string,
      firstName: plain.firstName as string,
      lastName: plain.lastName as string,
      roles: plain.roles as string[],
      status: plain.status as string,
      createdAt: plain.createdAt as string,
    };
  }
}
