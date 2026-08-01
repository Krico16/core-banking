import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { LedgerClient, LedgerTransferResult } from '../../domain/ports/ledger-client.port';

@Injectable()
export class LedgerHttpClient implements LedgerClient {
  private readonly logger = new Logger(LedgerHttpClient.name);
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    const baseURL = this.config.get<string>(
      'LEDGER_SERVICE_URL',
      'http://localhost:3004',
    );
    this.http = axios.create({
      baseURL,
      timeout: this.config.get<number>('LEDGER_TIMEOUT_MS', 10000),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async transfer(params: {
    sourceAccountId: string;
    targetAccountId: string;
    amount: number;
    currency: string;
    idempotencyKey: string;
    description?: string;
    paymentId?: string;
  }): Promise<LedgerTransferResult> {
    try {
      const response = await this.http.post(
        '/api/ledger/transfer',
        {
          sourceAccountId: params.sourceAccountId,
          targetAccountId: params.targetAccountId,
          // ledger-service espera un monto decimal (BigDecimal) en su API REST,
          // mientras que Money internamente guarda centavos (regla nº2 AGENTS.md).
          amount: (params.amount / 100).toFixed(2),
          currency: params.currency,
          description: params.description,
          paymentId: params.paymentId,
        },
        { headers: { 'Idempotency-Key': params.idempotencyKey } },
      );

      return {
        journalEntryId: response.data.journalEntryId,
        transactionId: response.data.transactionId,
        status: response.data.status,
      };
    } catch (error) {
      throw this.toLedgerException(error, 'transfer');
    }
  }

  async reverse(params: {
    originalEntryId: string;
    idempotencyKey: string;
    reason: string;
  }): Promise<LedgerTransferResult> {
    try {
      const response = await this.http.post(
        '/api/ledger/reverse',
        {
          originalEntryId: params.originalEntryId,
          reason: params.reason,
        },
        { headers: { 'Idempotency-Key': params.idempotencyKey } },
      );

      return {
        journalEntryId: response.data.journalEntryId,
        transactionId: response.data.transactionId,
        status: response.data.status,
      };
    } catch (error) {
      throw this.toLedgerException(error, 'reverse');
    }
  }

  private toLedgerException(error: unknown, operation: string): Error {
    if (axios.isAxiosError(error)) {
      const axiosErr = error as AxiosError<{ message?: string; code?: string }>;
      const status = axiosErr.response?.status;
      const detail =
        axiosErr.response?.data?.message || axiosErr.message;

      this.logger.warn(
        `Ledger ${operation} failed: status=${status} detail=${detail}`,
      );

      return new LedgerOperationException(
        operation,
        status,
        detail,
        this.mapReason(status, axiosErr.response?.data?.code),
      );
    }
    this.logger.error(`Ledger ${operation} unexpected error`, error);
    return new LedgerOperationException(operation, undefined, 'UNAVAILABLE', 'LEDGER_UNAVAILABLE');
  }

  private mapReason(status: number | undefined, code?: string): string {
    if (code) return code;
    switch (status) {
      case 404: return 'ACCOUNT_NOT_FOUND';
      case 409: return 'LEDGER_CONFLICT';
      case 400: return 'INVALID_LEDGER_REQUEST';
      default: return 'LEDGER_UNAVAILABLE';
    }
  }
}

export class LedgerOperationException extends Error {
  constructor(
    public readonly operation: string,
    public readonly httpStatus: number | undefined,
    public readonly detail: string,
    public readonly reason: string,
  ) {
    super(`Ledger ${operation} failed: ${detail}`);
    this.name = 'LedgerOperationException';
  }
}
