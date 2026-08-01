export enum PaymentStatus {
  CREATED = 'CREATED',
  VALIDATING = 'VALIDATING',
  RISK_REVIEW = 'RISK_REVIEW',
  AUTHORIZED = 'AUTHORIZED',
  POSTING = 'POSTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export const VALID_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.CREATED]: [PaymentStatus.VALIDATING, PaymentStatus.FAILED],
  [PaymentStatus.VALIDATING]: [PaymentStatus.RISK_REVIEW, PaymentStatus.FAILED],
  [PaymentStatus.RISK_REVIEW]: [PaymentStatus.AUTHORIZED, PaymentStatus.FAILED],
  [PaymentStatus.AUTHORIZED]: [PaymentStatus.POSTING, PaymentStatus.FAILED],
  [PaymentStatus.POSTING]: [PaymentStatus.COMPLETED, PaymentStatus.FAILED],
  [PaymentStatus.COMPLETED]: [PaymentStatus.REVERSED],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.REVERSED]: [],
};
