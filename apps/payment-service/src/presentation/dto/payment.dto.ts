import { IsNotEmpty, IsString, IsInt, IsOptional, MinLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreatePaymentDto {
  @ApiProperty({ description: 'Idempotency key for duplicate prevention' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiProperty({ description: 'Source account ID' })
  @IsString()
  @IsNotEmpty()
  sourceAccountId: string;

  @ApiProperty({ description: 'Target account ID' })
  @IsString()
  @IsNotEmpty()
  targetAccountId: string;

  @ApiProperty({ description: 'Amount in cents' })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Currency (ISO 4217)' })
  @IsString()
  @MinLength(3)
  currency: string;

  @ApiPropertyOptional({ description: 'Payment description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ReversePaymentDto {
  @ApiPropertyOptional({ description: 'Reason for reversal' })
  @IsOptional()
  @IsString()
  reason?: string;
}
