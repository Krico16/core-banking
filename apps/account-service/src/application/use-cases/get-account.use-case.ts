import { Injectable, Inject } from '@nestjs/common';
import { AccountId } from '../../domain/value-objects/account-id.vo';
import { AccountRepository, ACCOUNT_REPOSITORY } from '../../domain/ports/account-repository.port';
import { AccountNotFoundException } from '../../domain/exceptions/account-exceptions';
import { AccountResponse, toAccountResponse } from '../dto';

@Injectable()
export class GetAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly repo: AccountRepository,
  ) {}

  async byId(accountId: string): Promise<AccountResponse> {
    const id = AccountId.fromPlain(accountId);
    const account = await this.repo.findById(id);
    if (!account) throw new AccountNotFoundException(accountId);
    return toAccountResponse(account);
  }

  async byCustomerId(customerId: string): Promise<AccountResponse[]> {
    const accounts = await this.repo.findByCustomerId(customerId);
    return accounts.map(toAccountResponse);
  }
}
