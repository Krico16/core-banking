import {
  Body,
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  RegisterUseCase,
  LoginUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
  GetProfileUseCase,
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  TokenResponseDto,
  MessageResponseDto,
} from '../../application';
import { JwtAuthGuard, JwtRefreshAuthGuard } from '../guards';

interface RequestWithUser {
  user: {
    userId: string;
    tokenId: string;
    email: string;
    roles: string[];
  };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly getProfileUseCase: GetProfileUseCase,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
      ipAddress,
      userAgent,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshAuthGuard)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Req() req: RequestWithUser,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.refreshTokenUseCase.execute({
      userId: req.user.userId,
      tokenId: req.user.tokenId,
      ipAddress,
      userAgent,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshAuthGuard)
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async logout(@Req() req: RequestWithUser) {
    await this.logoutUseCase.execute({
      userId: req.user.userId,
      tokenId: req.user.tokenId,
    });
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all sessions' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async logoutAll(@Req() req: RequestWithUser) {
    await this.logoutUseCase.executeLogoutAll(req.user.userId);
    return { message: 'Logged out from all sessions' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@Req() req: RequestWithUser) {
    return this.getProfileUseCase.execute(req.user.userId);
  }
}
