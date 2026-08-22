import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { ClientIpThrottlerGuard } from './client-ip-throttler.guard';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
  ],
  providers: [{ provide: APP_GUARD, useClass: ClientIpThrottlerGuard }],
})
export class AppThrottlerModule {}
