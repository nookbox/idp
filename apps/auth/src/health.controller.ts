import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok'; service: 'auth' } {
    return { status: 'ok', service: 'auth' };
  }
}
