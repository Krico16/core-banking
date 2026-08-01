import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ApplicationModule } from '../application';
import { AuthController } from './controllers/auth.controller';
import { HealthController } from './controllers/health.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAuthGuard, JwtRefreshAuthGuard, RolesGuard } from './guards';

@Module({
  imports: [ApplicationModule, TerminusModule],
  controllers: [AuthController, HealthController],
  providers: [
    JwtStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
    JwtRefreshAuthGuard,
    RolesGuard,
  ],
})
export class PresentationModule {}
