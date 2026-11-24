import 'dotenv/config';

import type { INestApplication } from '@nestjs/common';
import {
  CLIENT_ID,
  CLIENT_SECRET,
  createPkce,
  createTestApp,
  getCode,
  postToken,
  REDIRECT_URI,
  WEB_URL,
} from './helpers';
import request from 'supertest';

describe('OIDC refresh token (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  function postRefresh(refreshToken: string) {
    return request(app.getHttpServer())
      .post('/api/oidc/token')
      .auth(CLIENT_ID, CLIENT_SECRET)
      .type('form')
      .send({ grant_type: 'refresh_token', refresh_token: refreshToken });
  }

  function revokeConsent() {
    return request(app.getHttpServer())
      .delete(`/api/oidc/consents/${CLIENT_ID}`)
      .set('Origin', WEB_URL);
  }

  it('1. scope 에 offline_access 있음 → /token 응답에 refresh_token 있음', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(
      app,
      codeChallenge,
      'openid email profile offline_access',
    );
    const tokenRes = await postToken(app, code, codeVerifier, REDIRECT_URI);

    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.refresh_token).toBeDefined();
  });
  it('2. scope 에 offline_access 없음 → refresh_token 없음', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(app, codeChallenge, 'openid email profile');
    const tokenRes = await postToken(app, code, codeVerifier, REDIRECT_URI);

    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.refresh_token).toBeUndefined();
  });
  it('3. grant_type=refresh_token → 200, 새 access_token', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(
      app,
      codeChallenge,
      'openid email profile offline_access',
    );
    const tokenRes = await postToken(app, code, codeVerifier, REDIRECT_URI);
    const refreshToken = tokenRes.body.refresh_token;

    const refreshRes = await postRefresh(refreshToken);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.access_token).toBeDefined();
  });

  it('4. 새로 받은 refresh_token 은 이전 것과 다름 (rotation)', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(
      app,
      codeChallenge,
      'openid email profile offline_access',
    );
    const tokenRes = await postToken(app, code, codeVerifier, REDIRECT_URI);
    const refreshToken = tokenRes.body.refresh_token;

    const refreshRes = await postRefresh(refreshToken);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.refresh_token).toBeDefined();
    expect(refreshRes.body.refresh_token).not.toBe(refreshToken);
  });

  it('5. 이미 쓴 refresh_token 다시 보냄 → 400 invalid_grant', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(
      app,
      codeChallenge,
      'openid email profile offline_access',
    );
    const tokenRes = await postToken(app, code, codeVerifier, REDIRECT_URI);
    const refreshToken = tokenRes.body.refresh_token;

    const firstRes = await postRefresh(refreshToken);
    expect(firstRes.status).toBe(200); // 첫 번째는 성공해야 "재사용이라 400" 이 의미 있음

    const reuseRes = await postRefresh(refreshToken); // 같은 토큰 또 사용

    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.error).toBe('invalid_grant');
  });

  it('6. 재사용 감지 후엔 새 refresh_token 도 → 400 (계열 전체 폐기)', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(
      app,
      codeChallenge,
      'openid email profile offline_access',
    );
    const tokenRes = await postToken(app, code, codeVerifier, REDIRECT_URI);
    const refreshToken = tokenRes.body.refresh_token;

    // 처음 토큰으로 refresh → 성공, 새 토큰을 받는다
    const firstRes = await postRefresh(refreshToken);
    expect(firstRes.status).toBe(200);
    const newRefreshToken = firstRes.body.refresh_token;

    // 처음 토큰을 한 번 더 보냄 = 재사용 → 400 (서버는 이때 이 계열 토큰을 전부 폐기)
    const secondRes = await postRefresh(refreshToken);
    expect(secondRes.status).toBe(400);
    expect(secondRes.body.error).toBe('invalid_grant');

    // 그래서 방금 받은 새 토큰도 → 400
    const thirdRes = await postRefresh(newRefreshToken);
    expect(thirdRes.status).toBe(400);
    expect(thirdRes.body.error).toBe('invalid_grant');
  });

  it('7. 동의 철회 후 refresh → 400 invalid_grant', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(
      app,
      codeChallenge,
      'openid email profile offline_access',
    );
    const tokenRes = await postToken(app, code, codeVerifier, REDIRECT_URI);
    expect(tokenRes.status).toBe(200);
    const refreshToken = tokenRes.body.refresh_token;
    expect(refreshToken).toBeDefined();

    // 동의 철회
    const revokeRes = await revokeConsent();
    expect(revokeRes.status).toBe(204);

    // refresh 시도
    const refreshRes = await postRefresh(refreshToken);
    expect(refreshRes.status).toBe(400);
    expect(refreshRes.body.error).toBe('invalid_grant');
  });
});
