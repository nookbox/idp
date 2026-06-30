import 'dotenv/config';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  oauthProviderAuthServerMetadata,
  oauthProviderOpenIdConfigMetadata,
} from '@better-auth/oauth-provider';
import { toNodeHandler } from 'better-auth/node';
import express, { type Express } from 'express';
import { RequestIdMiddleware } from './common';

import { AppModule } from './app.module';
import { auth } from './lib/auth';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  const configuredCorsOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const corsOrigins = [
    process.env.WEB_URL ?? 'http://localhost:3000',
    ...configuredCorsOrigins,
  ];
  app.enableCors({
    origin: [...new Set(corsOrigins)],
    credentials: true,
  });

  app.use(RequestIdMiddleware);

  // OIDC / OAuth 2.0 디스커버리 메타데이터.
  // issuer path가 /api/auth이므로 RFC 8414/OIDC Discovery 규칙에 맞춰
  //  - openid-configuration: issuer path 뒤에 .well-known을 붙임
  //  - oauth-authorization-server: .well-known 뒤에 issuer path를 붙임
  // catch-all(`app.use('/api/auth', ...)`)보다 먼저 등록해야 매칭된다.
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.get(
    '/api/auth/.well-known/openid-configuration',
    toNodeHandler(oauthProviderOpenIdConfigMetadata(auth)),
  );
  expressApp.get(
    '/.well-known/oauth-authorization-server/api/auth',
    toNodeHandler(oauthProviderAuthServerMetadata(auth)),
  );

  // better-auth는 가공되지 않은 원본 요청 스트림을 받아야 하므로
  // body parser 미들웨어보다 먼저 마운트한다.
  app.use('/api/auth', toNodeHandler(auth));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Auth server listening on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap auth server:', err);
  process.exit(1);
});
