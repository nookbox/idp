import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import {
  AllExceptionsFilter,
  AppLoggerModule,
  AppThrottlerModule,
  LoggingInterceptor,
} from './common';

import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { auth } from './lib/auth';
import { AuthModule } from './modules/auth/auth.module';
import { AvatarsModule } from './modules/avatars/avatars.module';

@Module({
  imports: [
    // ⚠️ BetterAuthModule 보다 먼저 와야 한다. 전역 가드는 모듈이 초기화되는
    //    순서대로 등록되고, 그 순서대로 실행된다. 뒤에 두면 세션 조회(DB 왕복)를
    //    하는 better-auth 의 AuthGuard 가 먼저 돌아서, 폭주 요청이 전부 DB 를
    //    한 번씩 때린 다음에야 429 를 맞는다.
    AppThrottlerModule,
    AppLoggerModule.forRoot({
      isProd: process.env.NODE_ENV === 'production',
      level: process.env.LOG_LEVEL,
      appName: 'Auth',
    }),
    BetterAuthModule.forRoot({
      auth,
      // CORS 는 main.ts 의 app.enableCors 가 담당한다. 여기서 또 켜면
      // trustedOrigins 기준으로 PATCH 가 빠진 설정이 중복 등록된다.
      disableTrustedOriginsCors: true,
    }),
    DatabaseModule,
    AuthModule,
    AvatarsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
