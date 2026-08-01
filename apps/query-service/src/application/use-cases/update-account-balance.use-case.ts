import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AccountViewRepository,
  ACCOUNT_VIEW_REPOSITORY,
} from '../../domain/ports/account-view-repository.port';
import { UpdateAccountBalanceInput } from '../dto/update-account-balance.input';

@Injectable()
export class UpdateAccountBalanceUseCase {
  private readonly logger = new Logger(UpdateAccountBalanceUseCase.name);

  constructor(@Inject(ACCOUNT_VIEW_REPOSITORY) private readonly repo: AccountViewRepository) {}

  async execute(input: UpdateAccountBalanceInput): Promise<void> {
    const view = await this.repo.findById(input.accountId);
    if (!view) {
      this.logger.warn(`AccountView for ${input.accountId} not found; skipping balance update`);
      return;
    }

    await this.repo.save(view.updateBalance(input.newBalance));
  }
}
