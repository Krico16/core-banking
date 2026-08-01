import {
  Controller, Get, Post, Body, Param, HttpCode, HttpStatus,
  UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { OpenAccountDto } from '../dto/open-account.dto';
import {
  OpenAccountUseCase, FreezeAccountUseCase,
  UnfreezeAccountUseCase, GetAccountUseCase,
} from '../../application';

@ApiTags('Accounts')
@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly openUC: OpenAccountUseCase,
    private readonly freezeUC: FreezeAccountUseCase,
    private readonly unfreezeUC: UnfreezeAccountUseCase,
    private readonly getUC: GetAccountUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Open a new account' })
  open(@Body() dto: OpenAccountDto) {
    return this.openUC.execute({
      customerId: dto.customerId,
      accountType: dto.accountType,
      currency: dto.currency,
      dailyLimitAmount: dto.dailyLimitAmount,
      transactionLimitAmount: dto.transactionLimitAmount,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get account by ID' })
  findOne(@Param('id') id: string) {
    return this.getUC.byId(id);
  }

  @Get('customer/:customerId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all accounts for a customer' })
  findByCustomer(@Param('customerId') customerId: string) {
    return this.getUC.byCustomerId(customerId);
  }

  @Post(':id/freeze')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Freeze an account' })
  freeze(@Param('id') id: string, @Body('reason') reason: string) {
    return this.freezeUC.execute(id, reason || 'MANUAL');
  }

  @Post(':id/unfreeze')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfreeze an account' })
  unfreeze(@Param('id') id: string) {
    return this.unfreezeUC.execute(id);
  }
}
