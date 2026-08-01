import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import {
  CreatePaymentUseCase,
  GetPaymentUseCase,
  ReversePaymentUseCase,
  AdvancePaymentUseCase,
} from '../../application/use-cases';
import { CreatePaymentDto, ReversePaymentDto } from '../dto/payment.dto';
import { PaymentResponse } from '../../application/dto';

@ApiTags('payments')
@Controller('api/payments')
export class PaymentsController {
  constructor(
    private readonly createPayment: CreatePaymentUseCase,
    private readonly getPayment: GetPaymentUseCase,
    private readonly reversePayment: ReversePaymentUseCase,
    private readonly advancePayment: AdvancePaymentUseCase,
    private readonly config: ConfigService,
  ) {}

  @Post('/transfer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new payment (transfer). Saga runs async.' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'X-User-Id', required: false })
  @ApiResponse({ status: 201, description: 'Payment created, saga started' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createTransfer(
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<PaymentResponse> {
    return this.createPayment.execute({
      sourceAccountId: dto.sourceAccountId,
      targetAccountId: dto.targetAccountId,
      amount: dto.amount,
      currency: dto.currency,
      description: dto.description,
      idempotencyKey: idempotencyKey || dto.idempotencyKey,
      initiatedBy: userId || 'anonymous',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment found' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentById(@Param('id') id: string): Promise<PaymentResponse> {
    return this.getPayment.byId(id);
  }

  @Post(':id/reverse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reverse a completed payment (compensates ledger)' })
  @ApiResponse({ status: 200, description: 'Payment reversed' })
  @ApiResponse({ status: 409, description: 'Cannot reverse' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async reversePaymentById(
    @Param('id') id: string,
    @Body() dto?: ReversePaymentDto,
  ): Promise<PaymentResponse> {
    return this.reversePayment.execute(id, dto?.reason);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete payment with ledger entry ID (internal)' })
  async completePayment(
    @Param('id') id: string,
    @Body('ledgerEntryId') ledgerEntryId: string,
  ): Promise<PaymentResponse> {
    return this.advancePayment.complete(id, ledgerEntryId);
  }

  @Post(':id/fail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark payment as failed (internal)' })
  async failPayment(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<PaymentResponse> {
    return this.advancePayment.fail(id, reason);
  }

  @Post(':id/advance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Advance payment to next state (dev only)' })
  async advanceToNext(@Param('id') id: string): Promise<PaymentResponse> {
    if (this.config.get('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }
    return this.advancePayment.advance(id);
  }
}
