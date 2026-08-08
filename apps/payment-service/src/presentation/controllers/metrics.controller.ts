import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { paymentsRegistry } from '../../infrastructure/metrics/payment-status.metrics';

@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', paymentsRegistry.contentType)
  async metrics(): Promise<string> {
    return paymentsRegistry.metrics();
  }
}
