import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import {
  AllExceptionsFilter,
  AppLoggerModule,
  AppThrottlerModule,
  LoggingInterceptor,
} from './common';

import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { AvatarsModule } from './modules/avatars/avatars.module';
import { OidcModule } from './modules/oidc/oidc.module';

@Module({
  imports: [
    // ⚠️ 나중에 전역 인증 가드를 붙이면 그 모듈보다 먼저 와야 한다. 전역 가드는
    //    등록된 순서대로 실행되어, 뒤에 두면 세션 조회(DB 왕복)가 먼저 돌고
    //    폭주 요청이 전부 DB 를 한 번씩 때린 다음에야 429 를 맞는다.
    AppThrottlerModule,
    AppLoggerModule.forRoot({
      isProd: process.env.NODE_ENV === 'production',
      level: process.env.LOG_LEVEL,
      appName: 'Auth',
    }),
    DatabaseModule,
    AvatarsModule,
    OidcModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
