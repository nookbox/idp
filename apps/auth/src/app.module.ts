import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import {
  AllExceptionsFilter,
  AppLoggerModule,
  LoggingInterceptor,
} from './common';

import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    AppLoggerModule.forRoot({
      isProd: process.env.NODE_ENV === 'production',
      level: process.env.LOG_LEVEL,
      appName: 'Auth',
    }),
    DatabaseModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
