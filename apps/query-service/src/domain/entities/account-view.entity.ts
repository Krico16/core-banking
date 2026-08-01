export class AccountView {
  private constructor(
    readonly accountId: string,
    readonly customerId: string,
    readonly accountNumber: string,
    readonly accountType: string,
    readonly currency: string,
    readonly balance: number,
    readonly updatedAt: Date,
  ) {}

  static create(props: {
    accountId: string;
    customerId: string;
    accountNumber: string;
    accountType: string;
    currency: string;
  }): AccountView {
    return new AccountView(
      props.accountId,
      props.customerId,
      props.accountNumber,
      props.accountType,
      props.currency,
      0,
      new Date(),
    );
  }

  static reconstruct(props: {
    accountId: string;
    customerId: string;
    accountNumber: string;
    accountType: string;
    currency: string;
    balance: number;
    updatedAt: Date;
  }): AccountView {
    return new AccountView(
      props.accountId,
      props.customerId,
      props.accountNumber,
      props.accountType,
      props.currency,
      props.balance,
      props.updatedAt,
    );
  }

  updateBalance(newBalance: number): AccountView {
    return new AccountView(
      this.accountId,
      this.customerId,
      this.accountNumber,
      this.accountType,
      this.currency,
      newBalance,
      new Date(),
    );
  }
}
