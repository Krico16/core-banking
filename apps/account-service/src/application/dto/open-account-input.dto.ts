export class OpenAccountInput {
  constructor(
    readonly customerId: string,
    readonly accountType: string,
    readonly currency: string,
    readonly dailyLimitAmount: number,
    readonly transactionLimitAmount: number,
  ) {}
}
