export interface CustomerVerificationRepository {
  isVerified(customerId: string): Promise<boolean>;
  upsert(customerId: string, verified: boolean): Promise<void>;
}

export const CUSTOMER_VERIFICATION_REPOSITORY = Symbol('CUSTOMER_VERIFICATION_REPOSITORY');
