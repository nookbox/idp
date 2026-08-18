import 'dotenv/config';

import { join } from 'path';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  oauthProviderAuthServerMetadata,
  oauthProviderOpenIdConfigMetadata,
} from '@better-auth/oauth-provider';
import { toNodeHandler } from 'better-auth/node';
import type { Express } from 'express';
import { RequestIdMiddleware } from './common';
import {
  UPLOAD_PUBLIC_PREFIX,
  UPLOAD_ROOT,
} from './modules/avatars/constants/avatars.constants';

import { AppModule } from './app.module';
import { auth } from './lib/auth';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false, // Required for Better Auth
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

  // 모든 Nest 컨트롤러를 /api 밑으로 모은다.
  app.setGlobalPrefix('api', { exclude: ['health'] });

  // 업로드된 아바타를 그대로 서빙한다.
  // globalPrefix 는 컨트롤러에만 적용되므로 여기는 /uploads 그대로 열린다.
  app.useStaticAssets(join(process.cwd(), UPLOAD_ROOT), {
    prefix: UPLOAD_PUBLIC_PREFIX,
  });

  // OIDC / OAuth 2.0 디스커버리 메타데이터.
  // issuer path가 /api/auth이므로 RFC 8414/OIDC Discovery 규칙에 맞춰
  //  - openid-configuration: issuer path 뒤에 .well-known을 붙임
  //  - oauth-authorization-server: .well-known 뒤에 issuer path를 붙임
  // AuthModule 이 /api/auth catch-all 을 붙이는 시점은 app.listen() 안의
  // init() 이라, 여기서 먼저 등록해두면 express 스택에서 앞선다.
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.get(
    '/api/auth/.well-known/openid-configuration',
    toNodeHandler(oauthProviderOpenIdConfigMetadata(auth)),
  );
  expressApp.get(
    '/.well-known/oauth-authorization-server/api/auth',
    toNodeHandler(oauthProviderAuthServerMetadata(auth)),
  );

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
