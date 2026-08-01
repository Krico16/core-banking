import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('api/health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  check() {
    return { status: 'ok', service: 'payment-service', timestamp: new Date().toISOString() };
  }

  @Get('/ready')
  @ApiOperation({ summary: 'Readiness check' })
  ready() {
    return { status: 'ready', service: 'payment-service' };
  }
}
