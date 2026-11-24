import 'dotenv/config'; // env 검사(oidc-config)보다 먼저 .env 를 읽어야 해서 맨 위

import { DATABASE, type Database } from '@/database/database.types';
import { oidcAuthorizationCodes, oidcClients } from '@/database/schema';
import type { INestApplication } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { inArray } from 'drizzle-orm';
import * as jose from 'jose';
import request from 'supertest';
import { REDIRECT_URI, createPkce, createTestApp } from './helpers';

// 동의 화면(web) 주소. /authorize 가 동의가 필요하면 여기로 보낸다
import { WEB_URL } from './helpers';
const CONSENT_PATH = '/consent';

// 테스트 client 들이 같이 쓰는 secret (테스트 안에서만 쓰는 랜덤값)
const CLIENT_SECRET = crypto.randomBytes(32).toString('base64url');

describe('OIDC consent (e2e)', () => {
  let app: INestApplication;
  let db: Database;

  // 테스트마다 새 client 를 만든다 → "저장된 동의 없음" 에서 시작 (테스트끼리 동의가 안 섞임)
  const createdClientIds: string[] = [];

  async function registerClient(skipConsent = false) {
    const clientId = `e2e-consent-${crypto.randomUUID()}`;
    await db.insert(oidcClients).values({
      clientId,
      name: 'E2E Consent',
      redirectUris: [REDIRECT_URI],
      clientSecretHash: await bcrypt.hash(CLIENT_SECRET, 10),
      skipConsent,
    });
    createdClientIds.push(clientId);
    return clientId;
  }

  // RP 가 브라우저를 /authorize 로 보내는 것
  function authorize(clientId: string, scope: string, codeChallenge: string) {
    return request(app.getHttpServer()).get('/api/oidc/authorize').query({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope,
      state: 'state-123',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
  }

  // 동의 화면(web)이 [허용]/[거부] 때 보내는 요청.
  // oauth_query = 동의 화면 URL 의 쿼리 그대로 (서명 sig·exp 포함)
  function postConsent(body: {
    oauth_query: string;
    accept: boolean;
    scope?: string; // 허락한 scope (accept=true 일 때)
  }) {
    return request(app.getHttpServer())
      .post('/api/oidc/consent')
      .set('Origin', WEB_URL) // CSRF 방어: 우리 web 에서 온 요청만
      .send(body);
  }

  // /authorize → 동의 화면 URL 의 쿼리만 꺼냄
  async function getConsentQuery(
    clientId: string,
    scope: string,
    codeChallenge: string,
  ) {
    const res = await authorize(clientId, scope, codeChallenge);
    expect(res.status).toBe(302);
    return new URL(res.headers.location).search.slice(1); // 앞의 '?' 뺌
  }

  // 이 파일의 client 로 /token (helpers 의 postToken 은 shop 고정이라 따로)
  function postToken(clientId: string, code: string, codeVerifier: string) {
    return request(app.getHttpServer())
      .post('/api/oidc/token')
      .auth(clientId, CLIENT_SECRET)
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      });
  }

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(DATABASE);
  });

  afterAll(async () => {
    if (createdClientIds.length > 0) {
      // client 를 참조하는 행 먼저 지운다 (동의 행은 FK cascade 라 client 와 같이 지워짐)
      await db
        .delete(oidcAuthorizationCodes)
        .where(inArray(oidcAuthorizationCodes.clientId, createdClientIds));
      await db
        .delete(oidcClients)
        .where(inArray(oidcClients.clientId, createdClientIds));
    }
    await app.close();
  });

  it('1. 처음 보는 user+client → code 대신 동의 화면으로 302', async () => {
    const clientId = await registerClient();
    const { codeChallenge } = createPkce();

    const res = await authorize(
      clientId,
      'openid email profile',
      codeChallenge,
    );

    expect(res.status).toBe(302);

    const location = new URL(res.headers.location);
    // RP 가 아니라 web 의 동의 화면으로
    expect(location.origin + location.pathname).toBe(
      `${WEB_URL}${CONSENT_PATH}`,
    );
    // 서명된 URL: 요청 내용 + exp + sig
    expect(location.searchParams.get('client_id')).toBe(clientId);
    expect(location.searchParams.get('scope')).toBe('openid email profile');
    expect(location.searchParams.get('exp')).toBeTruthy();
    expect(location.searchParams.get('sig')).toBeTruthy();
    // 아직 code 는 없어야 함
    expect(location.searchParams.get('code')).toBeNull();
  });

  it('2. 허용 → code 발급, 그 code 로 받은 토큰의 scope = 허락한 scope', async () => {
    const clientId = await registerClient();
    const { codeChallenge, codeVerifier } = createPkce();
    const oauthQuery = await getConsentQuery(
      clientId,
      'openid email profile',
      codeChallenge,
    );

    const res = await postConsent({
      oauth_query: oauthQuery,
      accept: true,
      scope: 'openid email profile',
    });

    // web 은 fetch 로 보내고, 받은 url 로 브라우저를 옮긴다
    expect(res.status).toBe(200);
    const url = new URL(res.body.url);
    expect(url.origin + url.pathname).toBe(REDIRECT_URI);
    expect(url.searchParams.get('state')).toBe('state-123');

    const code = url.searchParams.get('code');
    expect(code).toBeTruthy();

    const tokenRes = await postToken(clientId, code!, codeVerifier);
    expect(tokenRes.status).toBe(200);
    expect(jose.decodeJwt(tokenRes.body.access_token).scope).toBe(
      'openid email profile',
    );
  });

  it('3. 거부 → error=access_denied (+ state 그대로), code 없음', async () => {
    const clientId = await registerClient();
    const { codeChallenge } = createPkce();
    const oauthQuery = await getConsentQuery(
      clientId,
      'openid email profile',
      codeChallenge,
    );

    const res = await postConsent({ oauth_query: oauthQuery, accept: false });

    expect(res.status).toBe(200);
    const url = new URL(res.body.url);
    expect(url.origin + url.pathname).toBe(REDIRECT_URI);
    expect(url.searchParams.get('error')).toBe('access_denied');
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('code')).toBeNull();
  });

  it('4. 이미 동의한 scope 범위 안 → 동의 화면 없이 바로 code', async () => {
    const clientId = await registerClient();

    // 먼저 openid email profile 에 동의해 둔다
    const first = createPkce();
    const oauthQuery = await getConsentQuery(
      clientId,
      'openid email profile',
      first.codeChallenge,
    );
    await postConsent({
      oauth_query: oauthQuery,
      accept: true,
      scope: 'openid email profile',
    });

    // 그 안쪽(openid email)을 다시 요청 → 바로 RP 로 code
    const { codeChallenge } = createPkce();
    const res = await authorize(clientId, 'openid email', codeChallenge);

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.origin + location.pathname).toBe(REDIRECT_URI);
    expect(location.searchParams.get('code')).toBeTruthy();
  });

  it('5. 더 넓은 scope 요청 → 다시 동의 화면', async () => {
    const clientId = await registerClient();

    // openid email 만 동의해 둔다
    const first = createPkce();
    const oauthQuery = await getConsentQuery(
      clientId,
      'openid email',
      first.codeChallenge,
    );
    await postConsent({
      oauth_query: oauthQuery,
      accept: true,
      scope: 'openid email',
    });

    // profile 까지 요청 → 동의 안 한 게 있으니 다시 동의 화면
    const { codeChallenge } = createPkce();
    const res = await authorize(
      clientId,
      'openid email profile',
      codeChallenge,
    );

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.origin + location.pathname).toBe(
      `${WEB_URL}${CONSENT_PATH}`,
    );
    expect(location.searchParams.get('code')).toBeNull();
  });

  it('6. 일부만 허용 (email O, profile X) → /userinfo 에 name 없음', async () => {
    const clientId = await registerClient();
    const { codeChallenge, codeVerifier } = createPkce();
    const oauthQuery = await getConsentQuery(
      clientId,
      'openid email profile',
      codeChallenge,
    );

    const res = await postConsent({
      oauth_query: oauthQuery,
      accept: true,
      scope: 'openid email', // profile 은 체크 해제
    });
    const code = new URL(res.body.url).searchParams.get('code')!;

    const tokenRes = await postToken(clientId, code, codeVerifier);
    const { access_token } = tokenRes.body;
    expect(jose.decodeJwt(access_token).scope).toBe('openid email');

    const userInfo = await request(app.getHttpServer())
      .get('/api/oidc/userinfo')
      .set('Authorization', `Bearer ${access_token}`);

    expect(userInfo.status).toBe(200);
    expect(userInfo.body.email).toBeDefined();
    expect(userInfo.body.name).toBeUndefined();
  });

  it('7. 동의 생략 client → 동의 화면 없이 바로 code', async () => {
    const clientId = await registerClient(true);
    const { codeChallenge } = createPkce();

    const res = await authorize(
      clientId,
      'openid email profile',
      codeChallenge,
    );

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.origin + location.pathname).toBe(REDIRECT_URI);
    expect(location.searchParams.get('code')).toBeTruthy();
  });

  // ── 서명된 URL·CSRF 방어 (결정의 "꼭 챙길 것") ──

  it('8. oauth_query 를 조작하면 (scope 바꿔치기) → 400, code 없음', async () => {
    const clientId = await registerClient();
    const { codeChallenge } = createPkce();
    const oauthQuery = await getConsentQuery(
      clientId,
      'openid email',
      codeChallenge,
    );

    // 서명은 그대로 두고 scope 만 넓힘
    const tampered = new URLSearchParams(oauthQuery);
    tampered.set('scope', 'openid email profile');

    const res = await postConsent({
      oauth_query: tampered.toString(),
      accept: true,
      scope: 'openid email profile',
    });

    expect(res.status).toBe(400);
    expect(res.body.url).toBeUndefined();
  });

  it('9. 요청한 것보다 넓게 허용 → 400 (허락은 요청 범위 안에서만)', async () => {
    const clientId = await registerClient();
    const { codeChallenge } = createPkce();
    const oauthQuery = await getConsentQuery(
      clientId,
      'openid email',
      codeChallenge,
    );

    const res = await postConsent({
      oauth_query: oauthQuery,
      accept: true,
      scope: 'openid email profile', // 요청에 없던 profile
    });

    expect(res.status).toBe(400);
    expect(res.body.url).toBeUndefined();
  });

  it('10. 우리 web 이 아닌 Origin 에서 온 POST → 403 (CSRF)', async () => {
    const clientId = await registerClient();
    const { codeChallenge } = createPkce();
    const oauthQuery = await getConsentQuery(
      clientId,
      'openid email profile',
      codeChallenge,
    );

    const res = await request(app.getHttpServer())
      .post('/api/oidc/consent')
      .set('Origin', 'https://evil.example')
      .send({
        oauth_query: oauthQuery,
        accept: true,
        scope: 'openid email profile',
      });

    expect(res.status).toBe(403);
    expect(res.body.url).toBeUndefined();
  });

  it('11. 동의 철회 → 204, 다시 /authorize 하면 동의 화면', async () => {
    const clientId = await registerClient();
    const { codeChallenge } = createPkce();
    const oauthQuery = await getConsentQuery(
      clientId,
      'openid email profile',
      codeChallenge,
    );

    const res = await postConsent({
      oauth_query: oauthQuery,
      accept: true,
      scope: 'openid email profile',
    });

    // 동의 저장
    expect(res.status).toBe(200);

    // 동의 철회
    const deleteConsentRes = await request(app.getHttpServer())
      .delete(`/api/oidc/consents/${clientId}`)
      .set('Origin', WEB_URL);

    expect(deleteConsentRes.status).toBe(204);

    const redirectRes = await authorize(
      clientId,
      'openid email profile',
      codeChallenge,
    );

    expect(redirectRes.status).toBe(302);
    const location = new URL(redirectRes.headers.location);
    // 철회했으니 RP 가 아니라 다시 동의 화면으로, code 없이
    expect(location.origin + location.pathname).toBe(
      `${WEB_URL}${CONSENT_PATH}`,
    );
    expect(location.searchParams.get('code')).toBeNull();
  });

  it('12. 철회를 다른 Origin 에서 보내면 → 403 (CSRF)', async () => {
    const clientId = await registerClient();

    const res = await request(app.getHttpServer())
      .delete(`/api/oidc/consents/${clientId}`)
      .set('Origin', 'https://evil.example');

    expect(res.status).toBe(403);
  });

  it('13. 동의한 적 없는 client 철회 → 204 (몇 번 불러도 같은 결과)', async () => {
    const clientId = await registerClient(); // 새 client = 저장된 동의 없음

    const res = await request(app.getHttpServer())
      .delete(`/api/oidc/consents/${clientId}`)
      .set('Origin', WEB_URL);

    expect(res.status).toBe(204);
  });

  it.todo('14. 로그인 안 한 상태로 철회 → 401 (세션 생기면, Phase 2)');
});
