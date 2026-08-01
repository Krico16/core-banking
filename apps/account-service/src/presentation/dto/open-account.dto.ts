import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { CurrencyValue } from '../../domain/value-objects/currency.vo';

export enum AccountTypeDto {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS',
}

export class OpenAccountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ enum: AccountTypeDto })
  @IsEnum(AccountTypeDto)
  accountType: string;

  @ApiProperty({ enum: CurrencyValue, example: 'EUR' })
  @IsEnum(CurrencyValue)
  currency: string;

  @ApiProperty({ description: 'Daily limit in cents', default: 1000000 })
  @IsInt()
  @Min(0)
  dailyLimitAmount: number;

  @ApiProperty({ description: 'Per-transaction limit in cents', default: 500000 })
  @IsInt()
  @Min(0)
  transactionLimitAmount: number;
}
