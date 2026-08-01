export class InvalidPaymentException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPaymentException';
  }
}

export class PaymentNotFoundException extends Error {
  constructor(paymentId: string) {
    super(`Payment not found: ${paymentId}`);
    this.name = 'PaymentNotFoundException';
  }
}

export class PaymentAlreadyProcessedException extends Error {
  constructor(paymentId: string) {
    super(`Payment already processed: ${paymentId}`);
    this.name = 'PaymentAlreadyProcessedException';
  }
}
