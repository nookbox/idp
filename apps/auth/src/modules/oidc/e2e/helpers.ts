import 'dotenv/config';

import { AppModule } from '@/app.module';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as crypto from 'crypto';
import request, { type Response } from 'supertest';

// OIDC e2e 공통 도우미. 각 *.e2e.spec.ts 가 import 해서 쓴다.
// 테스트가 RP·브라우저 역할을 한다 (code 는 IdP 가 만들고, 테스트는 Location 에서 꺼내기만)

export const CLIENT_ID = process.env.CLIENT_ID!;
export const CLIENT_SECRET = process.env.CLIENT_SECRET!;
export const REDIRECT_URI = 'http://localhost:4000/callback';

// 진짜 서버를 띄운다 (main.ts 와 같게 /api prefix). 파일마다 beforeAll 에서 한 번
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api', { exclude: ['health'] });
  await app.init();
  return app;
}

export function createPkce() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge };
}

// /authorize 를 불러서 302 Location 에서 code 꺼내기
export async function getCode(
  app: INestApplication,
  codeChallenge: string,
  scope = 'openid email profile',
) {
  // ① 보내기: 서버에 /authorize 요청 (컨트롤러의 @Query 가 이걸 받음)
  const res = await request(app.getHttpServer())
    .get('/api/oidc/authorize')
    .query({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

  // ② 받은 응답 확인: 302 여야 함
  expect(res.status).toBe(302);

  // ③ 꺼내기: Location 주소에서 code 만
  //    "http://localhost:4000/callback?code=abc" → "abc"
  return new URL(res.headers.location).searchParams.get('code')!;
}

export async function postToken(
  app: INestApplication,
  code: string,
  codeVerifier: string,
  redirectUri: string,
  clientSecret = CLIENT_SECRET,
): Promise<Response> {
  return request(app.getHttpServer())
    .post('/api/oidc/token')
    .auth(CLIENT_ID, clientSecret) // Authorization: Basic ... 헤더를 만들어 줌
    .type('form') // form-urlencoded 로 보냄 (JSON 아님)
    .send({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });
}
