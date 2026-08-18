import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import {
  AllExceptionsFilter,
  AppLoggerModule,
  LoggingInterceptor,
} from './common';

import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { auth } from './lib/auth';
import { AuthModule } from './modules/auth/auth.module';
import { AvatarsModule } from './modules/avatars/avatars.module';

@Module({
  imports: [
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
