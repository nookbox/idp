import 'dotenv/config'; // env 검사(oidc-config)보다 먼저 .env 를 읽어야 해서 맨 위

import { DATABASE, type Database } from '@/database/database.types';
import { oidcAuthorizationCodes } from '@/database/schema';
import type { INestApplication } from '@nestjs/common';
import * as crypto from 'crypto';
import { eq } from 'drizzle-orm';
import * as jose from 'jose';
import request from 'supertest';
import {
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
  createPkce,
  createTestApp,
  getCode,
  postToken,
} from './helpers';

// /authorize·/token (단계 4~6)
describe('OIDC /token (e2e)', () => {
  let app: INestApplication;
  let db: Database;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(DATABASE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. 정상 → 200, id_token·access_token, Cache-Control: no-store', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(app, codeChallenge);

    const res = await postToken(app, code, codeVerifier, REDIRECT_URI);

    expect(res.status).toBe(200);

    expect(res.body.id_token).toBeDefined();
    expect(res.body.access_token).toBeDefined();
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('2. secret 틀림 → 401 invalid_client', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(app, codeChallenge);

    const res = await postToken(
      app,
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
    const code = await getCode(app, codeChallenge);

    const first = await postToken(app, code, codeVerifier, REDIRECT_URI);
    expect(first.status).toBe(200);

    const second = await postToken(app, code, codeVerifier, REDIRECT_URI);

    expect(second.status).toBe(400);
    expect(second.body.error).toBe('invalid_grant');
  });

  it('4. 틀린 code_verifier → 400 invalid_grant', async () => {
    const { codeChallenge } = createPkce();
    const code = await getCode(app, codeChallenge);

    const { codeVerifier: wrongVerifier } = createPkce(); // 짝이 아닌 verifier
    const res = await postToken(app, code, wrongVerifier, REDIRECT_URI);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
  });

  it('5. 다른 redirect_uri → 400 invalid_grant', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(app, codeChallenge);

    const wrongRedirectUrl = 'http://localhost:4000/other';

    const res = await postToken(app, code, codeVerifier, wrongRedirectUrl);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
  });

  it('6. 만료된 code → 400 invalid_grant', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(app, codeChallenge);
    const codeHash = crypto
      .createHash('sha256')
      .update(code)
      .digest('base64url');

    await db
      .update(oidcAuthorizationCodes)
      .set({ expiresAt: new Date(Date.now() - 1000) }) // 1초 전
      .where(eq(oidcAuthorizationCodes.codeHash, codeHash));

    const res = await postToken(app, code, codeVerifier, REDIRECT_URI);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
  });

  it('7. id_token 헤더 kid 가 /jwks 에 있다', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(app, codeChallenge);
    const res = await postToken(app, code, codeVerifier, REDIRECT_URI);
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
    const code = await getCode(app, codeChallenge);

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
