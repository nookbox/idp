import 'dotenv/config';

import { resolve } from 'path';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { RequestIdMiddleware } from './common';
import {
  AVATAR_DIR,
  AVATAR_PUBLIC_PATH,
} from './modules/avatars/constants/avatars.constants';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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
  //
  // resolve 를 쓰는 이유는 AVATAR_DIR 이 개발에서는 상대 경로,
  // 운영에서는 볼륨 절대 경로(/data/avatars)로 들어오기 때문이다.
  app.useStaticAssets(resolve(AVATAR_DIR), { prefix: AVATAR_PUBLIC_PATH });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT) || 3011;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Auth server listening on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap auth server:', err);
  process.exit(1);
});
