import 'dotenv/config';

import { DATABASE, type Database } from '@/database/database.types';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as crypto from 'crypto';

import * as jose from 'jose';

import { AppModule } from '@/app.module';
import { oidcAuthorizationCodes } from '@/database/schema';
import { eq } from 'drizzle-orm';
import request, { type Response } from 'supertest';

const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;
const REDIRECT_URI = 'http://localhost:4000/callback';

describe('OIDC (e2e)', () => {
  let app: INestApplication;
  let db: Database;

  // 테스트 전에 한 번: 진짜 서버를 띄운다 (main.ts 와 같게 /api prefix)
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health'] });

    await app.init();
    db = app.get(DATABASE);
  });

  // 테스트 끝나면 서버와 DB 연결을 닫는다
  afterAll(async () => {
    await app.close();
  });

  // ─────────────────────────────────────────
  // 도우미: 매 테스트마다 새 code 가 필요하다 (code 는 한 번만 쓸 수 있으니까)
  // ─────────────────────────────────────────

  function createPkce() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return { codeVerifier, codeChallenge };
  }

  // /authorize 를 불러서 302 Location 에서 code 꺼내기
  async function getCode(codeChallenge: string) {
    // ① 보내기: 서버에 /authorize 요청 (컨트롤러의 @Query 가 이걸 받음)
    const res = await request(app.getHttpServer())
      .get('/api/oidc/authorize')
      .query({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: 'openid email profile',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

    // ② 받은 응답 확인: 302 여야 함
    expect(res.status).toBe(302);

    // ③ 꺼내기: Location 주소에서 code 만
    //    "http://localhost:4000/callback?code=abc" → "abc"
    return new URL(res.headers.location).searchParams.get('code')!;
  }

  async function postToken(
    code: string,
    codeVerifier: string,
    redirectUri: string,
    clientSecret = CLIENT_SECRET,
  ): Promise<Response> {
    const res = await request(app.getHttpServer())
      .post('/api/oidc/token')
      .auth(CLIENT_ID, clientSecret) // Authorization: Basic ... 헤더를 만들어 줌
      .type('form') // form-urlencoded 로 보냄 (JSON 아님)
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      });

    return res;
  }

  // ─────────────────────────────────────────
  // 테스트들
  // ─────────────────────────────────────────

  it('1. 정상 → 200, id_token·access_token, Cache-Control: no-store', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(codeChallenge);

    const res = await postToken(code, codeVerifier, REDIRECT_URI);

    expect(res.status).toBe(200);

    expect(res.body.id_token).toBeDefined();
    expect(res.body.access_token).toBeDefined();
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('2. secret 틀림 → 401 invalid_client', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(codeChallenge);

    const res = await postToken(
      code,
      codeVerifier,
      REDIRECT_URI,
      'wrong-secret',
    );

    expect(res.headers['www-authenticate']).toBe('Basic realm="OIDC"');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_client');
  });

  it('3. 같은 code 두 번 → 두 번째 400 invalid_grant', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(codeChallenge);

    const first = await postToken(code, codeVerifier, REDIRECT_URI);
    expect(first.status).toBe(200);

    const second = await postToken(code, codeVerifier, REDIRECT_URI);

    expect(second.status).toBe(400);
    expect(second.body.error).toBe('invalid_grant');
  });

  it('4. 틀린 code_verifier → 400 invalid_grant', async () => {
    const { codeChallenge } = createPkce();
    const code = await getCode(codeChallenge);

    const { codeVerifier: wrongVerifier } = createPkce(); // 짝이 아닌 verifier
    const res = await postToken(code, wrongVerifier, REDIRECT_URI);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
  });

  it('5. 다른 redirect_uri → 400 invalid_grant', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(codeChallenge);

    const wrongRedirectUrl = 'http://localhost:4000/other';

    const res = await postToken(code, codeVerifier, wrongRedirectUrl);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
  });

  it('6. 만료된 code → 400 invalid_grant', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(codeChallenge);
    const codeHash = crypto
      .createHash('sha256')
      .update(code)
      .digest('base64url');

    await db
      .update(oidcAuthorizationCodes)
      .set({ expiresAt: new Date(Date.now() - 1000) }) // 1초 전
      .where(eq(oidcAuthorizationCodes.codeHash, codeHash));

    const res = await postToken(code, codeVerifier, REDIRECT_URI);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
  });

  it('7. id_token 헤더 kid 가 /jwks 에 있다', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(codeChallenge);
    const res = await postToken(code, codeVerifier, REDIRECT_URI);
    const idToken = res.body.id_token;

    const { kid } = jose.decodeProtectedHeader(idToken);

    const jwksRes = await request(app.getHttpServer()).get('/api/oidc/jwks');
    expect(jwksRes.body.keys.map((k: jose.JWK) => k.kid)).toContain(kid);
  });

  it('8 /authorize에 code_challenge 없이 요청을하면 error="invalid_request" 를 url에 담아서 보낸다.', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/oidc/authorize')
      .query({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: 'openid email profile',
        // code_challenge: codeChallenge,
        // code_challenge_method: 'S256',
      });

    expect(res.status).toBe(302);

    const location = new URL(res.headers.location);
    expect(location.searchParams.get('error')).toBe('invalid_request');
    expect(location.searchParams.get('code')).toBeNull(); // 거절했으니 code 는 없어야 함
  });

  it('9. /token에 code_verifier 없이 요청을 하면 400, invalid_request를 뱉는다.', async () => {
    const { codeChallenge } = createPkce();
    const code = await getCode(codeChallenge);

    const res = await request(app.getHttpServer())
      .post('/api/oidc/token')
      .auth(CLIENT_ID, CLIENT_SECRET)
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        // code_verifier 없음
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });
});
