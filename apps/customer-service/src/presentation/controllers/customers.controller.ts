import {
  Controller, Get, Post, Put, Body, Param, HttpCode, HttpStatus,
  UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import {
  RegisterCustomerUseCase, VerifyKycUseCase, SuspendCustomerUseCase,
  ReactivateCustomerUseCase, UpdateCustomerUseCase, GetCustomerUseCase,
} from '../../application';

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly registerUC: RegisterCustomerUseCase,
    private readonly verifyKycUC: VerifyKycUseCase,
    private readonly suspendUC: SuspendCustomerUseCase,
    private readonly reactivateUC: ReactivateCustomerUseCase,
    private readonly updateUC: UpdateCustomerUseCase,
    private readonly getUC: GetCustomerUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new customer' })
  create(@Body() dto: CreateCustomerDto, @Req() req: RequestWithUser) {
    return this.registerUC.execute({
      userId: dto.userId,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phoneNumber: dto.phoneNumber,
      country: dto.country,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current customer by JWT userId' })
  getMe(@Req() req: RequestWithUser) {
    return this.getUC.byUserId(req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(@Param('id') id: string) {
    return this.getUC.byId(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update customer profile' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.updateUC.execute({ id, ...dto });
  }

  @Post(':id/verify-kyc')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify KYC for customer' })
  verifyKyc(@Param('id') id: string) {
    return this.verifyKycUC.execute(id);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend a customer' })
  suspend(@Param('id') id: string, @Body('reason') reason: string) {
    return this.suspendUC.execute(id, reason || 'MANUAL');
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate a suspended customer' })
  reactivate(@Param('id') id: string) {
    return this.reactivateUC.execute(id);
  }
}
