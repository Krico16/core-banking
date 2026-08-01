import { PaymentView } from '../entities/payment-view.entity';

export interface PaymentViewRepository {
  save(view: PaymentView): Promise<void>;
  findById(paymentId: string): Promise<PaymentView | null>;
}

export const PAYMENT_VIEW_REPOSITORY = Symbol('PAYMENT_VIEW_REPOSITORY');
