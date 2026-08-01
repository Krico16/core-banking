import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  InvalidPaymentException,
  PaymentNotFoundException,
  PaymentAlreadyProcessedException,
} from '../../domain/exceptions/payment-exceptions';
import { LedgerOperationException } from '../../infrastructure/http/ledger-http.client';

interface ErrorBody {
  timestamp: string;
  status: number;
  code: string;
  message: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, code, message } = this.map(exception);

    if (status >= 500) {
      this.logger.error(`Unhandled exception: ${message}`, exception);
    }

    const body: ErrorBody = {
      timestamp: new Date().toISOString(),
      status,
      code,
      message,
    };

    response.status(status).json(body);
  }

  private map(exception: unknown): {
    status: number;
    code: string;
    message: string;
  } {
    if (exception instanceof PaymentNotFoundException) {
      return {
        status: HttpStatus.NOT_FOUND,
        code: 'PAYMENT_NOT_FOUND',
        message: exception.message,
      };
    }

    if (exception instanceof InvalidPaymentException) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'INVALID_PAYMENT',
        message: exception.message,
      };
    }

    if (exception instanceof PaymentAlreadyProcessedException) {
      return {
        status: HttpStatus.CONFLICT,
        code: 'PAYMENT_ALREADY_PROCESSED',
        message: exception.message,
      };
    }

    if (exception instanceof LedgerOperationException) {
      return {
        status: HttpStatus.BAD_GATEWAY,
        code: exception.reason,
        message: exception.message,
      };
    }

    if (exception instanceof Error && exception.name === 'InvalidTransitionError') {
      return {
        status: HttpStatus.CONFLICT,
        code: 'INVALID_TRANSITION',
        message: exception.message,
      };
    }

    // Transiciones inválidas de la máquina de estados (Error genérico de dominio)
    if (
      exception instanceof Error &&
      exception.message.startsWith('Invalid transition')
    ) {
      return {
        status: HttpStatus.CONFLICT,
        code: 'INVALID_TRANSITION',
        message: exception.message,
      };
    }

    if (exception instanceof Error && exception.message.startsWith('Cannot reverse')) {
      return {
        status: HttpStatus.CONFLICT,
        code: 'CANNOT_REVERSE',
        message: exception.message,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Unexpected error',
    };
  }
}
