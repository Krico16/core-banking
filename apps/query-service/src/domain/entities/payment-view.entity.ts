export class PaymentView {
  private constructor(
    readonly paymentId: string,
    readonly sourceAccountId: string,
    readonly targetAccountId: string,
    readonly amount: number,
    readonly currency: string,
    readonly description: string | null,
    readonly initiatedBy: string,
    readonly status: string,
    readonly ledgerEntryId: string | null,
    readonly failureReason: string | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly completedAt: Date | null,
    readonly reversedAt: Date | null,
  ) {}

  /** Los 4 eventos de pago (Created/Authorized/Completed/Rejected/Reversed) llevan
   * el snapshot completo del pago — no hace falta lógica incremental por tipo de
   * evento, cada uno simplemente reemplaza la vista entera. */
  static fromSnapshot(props: {
    paymentId: string;
    sourceAccountId: string;
    targetAccountId: string;
    amount: number;
    currency: string;
    description: string | null;
    initiatedBy: string;
    status: string;
    ledgerEntryId: string | null;
    failureReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    reversedAt: Date | null;
  }): PaymentView {
    return new PaymentView(
      props.paymentId,
      props.sourceAccountId,
      props.targetAccountId,
      props.amount,
      props.currency,
      props.description,
      props.initiatedBy,
      props.status,
      props.ledgerEntryId,
      props.failureReason,
      props.createdAt,
      props.updatedAt,
      props.completedAt,
      props.reversedAt,
    );
  }
}
