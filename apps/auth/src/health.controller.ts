import { Controller, Get } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller('health')
export class HealthController {
  @AllowAnonymous()
  @Get()
  check(): { status: 'ok'; service: 'auth' } {
    return { status: 'ok', service: 'auth' };
  }
}
