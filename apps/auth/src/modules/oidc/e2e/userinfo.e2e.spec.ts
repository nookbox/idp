import 'dotenv/config'; // env 검사(oidc-config)보다 먼저 .env 를 읽어야 해서 맨 위

import type { INestApplication } from '@nestjs/common';
import * as jose from 'jose';
import request from 'supertest';
import { OidcReader } from '../readers/oidc.reader';
import {
  REDIRECT_URI,
  createPkce,
  createTestApp,
  getCode,
  postToken,
} from './helpers';

// GET /userinfo (단계 7)
describe('OIDC /userinfo (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('10. /userinfo 정상 → 200, sub 가 id_token 의 sub 와 같다', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(app, codeChallenge);

    const tokenRes = await postToken(app, code, codeVerifier, REDIRECT_URI);
    const { access_token, id_token } = tokenRes.body;

    const res = await request(app.getHttpServer())
      .get('/api/oidc/userinfo')
      .set('Authorization', `Bearer ${access_token}`);

    expect(res.status).toBe(200);
    expect(res.body.sub).toBe(jose.decodeJwt(id_token).sub);
  });

  it('11. /userinfo 헤더 없음 → 401, WWW-Authenticate: Bearer', async () => {
    const res = await request(app.getHttpServer()).get('/api/oidc/userinfo');

    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toMatch(/^Bearer/);
  });

  it('12. /userinfo 깨진 토큰 → 401, invalid_token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/oidc/userinfo')
      .set('Authorization', 'Bearer abc.def.ghi'); // 아무렇게나 만든 가짜 토큰

    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toBe(
      'Bearer error="invalid_token"',
    );
    expect(res.body.error).toBe('invalid_token');
  });

  it('13. Bearer에 access_token 대신 id_token을 넣으면 401이 나온다.', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(app, codeChallenge);

    const tokenRes = await postToken(app, code, codeVerifier, REDIRECT_URI);
    const { id_token } = tokenRes.body;

    const res = await request(app.getHttpServer())
      .get('/api/oidc/userinfo')
      .set('Authorization', `Bearer ${id_token}`);

    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toBe(
      'Bearer error="invalid_token"',
    );
    expect(res.body.error).toBe('invalid_token');
  });

  it('14. 만료된 access_token을 보내면 401 invalid_token이 나온다.', async () => {
    // 1. 정상 access_token 을 받아서 내용(payload)만 꺼낸다
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(app, codeChallenge);
    const tokenRes = await postToken(app, code, codeVerifier, REDIRECT_URI);
    const payload = jose.decodeJwt(tokenRes.body.access_token);

    // 2. 준비: 서버와 같은 키로, exp 만 과거로 바꿔 다시 서명 (서명은 진짜, 만료만 다름)
    const signingKey = await app.get(OidcReader).getSigningKey();
    const now = Math.floor(Date.now() / 1000);
    const expiredToken = await new jose.SignJWT({
      ...payload,
      iat: now - 20 * 60, // 20분 전 발급
      exp: now - 5 * 60, // 5분 전 만료
    })
      .setProtectedHeader({ alg: 'RS256', kid: signingKey!.kid, typ: 'at+jwt' })
      .sign(signingKey!.privateKey);

    // 3. 보내기
    const res = await request(app.getHttpServer())
      .get('/api/oidc/userinfo')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toBe(
      'Bearer error="invalid_token"',
    );
    expect(res.body.error).toBe('invalid_token');
  });

  it('15. scope에 따라 email과 name이 응답에 나와야한다.', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(app, codeChallenge);
    const tokenRes = await postToken(app, code, codeVerifier, REDIRECT_URI);
    const { access_token, id_token } = tokenRes.body;

    const res = await request(app.getHttpServer())
      .get('/api/oidc/userinfo')
      .set('Authorization', `Bearer ${access_token}`);

    const idClaims = jose.decodeJwt(id_token);

    expect(res.status).toBe(200);
    expect(res.body.email).toBeDefined();
    expect(res.body.email).toBe(idClaims.email);
    expect(res.body.email_verified).toBe(idClaims.email_verified);
    expect(res.body.name).toBe(idClaims.name);
  });

  it('16. 사용자가 없으면 401을 뱉는다.', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(app, codeChallenge);
    const tokenRes = await postToken(app, code, codeVerifier, REDIRECT_URI);
    const payload = jose.decodeJwt(tokenRes.body.access_token);

    //  서버와 같은 키로, sub 만 DB 에 없는 id 로 바꿔 다시 서명 (탈퇴한 사용자 흉내)
    const signingKey = await app.get(OidcReader).getSigningKey();
    const missingUserToken = await new jose.SignJWT({
      ...payload,
      sub: 'no-such-user', // 없는 sub
    })
      .setProtectedHeader({ alg: 'RS256', kid: signingKey!.kid, typ: 'at+jwt' })
      .sign(signingKey!.privateKey);

    // 유저 정보 요청
    const res = await request(app.getHttpServer())
      .get('/api/oidc/userinfo')
      .set('Authorization', `Bearer ${missingUserToken}`);

    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toBe(
      'Bearer error="invalid_token"',
    );
    expect(res.body.error).toBe('invalid_token');
  });

  it('17. 등록 안된 client(aud)의 토큰이면 401 invalid_token을 리턴한다.', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(app, codeChallenge);
    const tokenRes = await postToken(app, code, codeVerifier, REDIRECT_URI);
    const payload = jose.decodeJwt(tokenRes.body.access_token);

    // 서버와 같은 키로, aud 만 등록 안 된 client 로 바꿔 다시 서명 (서명·만료·sub 는 정상)
    const signingKey = await app.get(OidcReader).getSigningKey();
    const missingClientToken = await new jose.SignJWT({
      ...payload,
      aud: 'no-such-client',
    })
      .setProtectedHeader({ alg: 'RS256', kid: signingKey!.kid, typ: 'at+jwt' })
      .sign(signingKey!.privateKey);

    const res = await request(app.getHttpServer())
      .get('/api/oidc/userinfo')
      .set('Authorization', `Bearer ${missingClientToken}`);

    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toBe(
      'Bearer error="invalid_token"',
    );
    expect(res.body.error).toBe('invalid_token');
  });

  it('18. openid만 요청하면 sub만 나와야한다.', async () => {
    const { codeChallenge, codeVerifier } = createPkce();
    const code = await getCode(app, codeChallenge, 'openid');

    const tokenRes = await postToken(app, code, codeVerifier, REDIRECT_URI);
    const { access_token, id_token } = tokenRes.body;

    const res = await request(app.getHttpServer())
      .get('/api/oidc/userinfo')
      .set('Authorization', `Bearer ${access_token}`);

    const idClaims = jose.decodeJwt(id_token);

    expect(res.status).toBe(200);

    // openid scope 의 claim 은 sub (있어야 함, id_token 과 같아야 함)
    expect(res.body.sub).toBeDefined();
    expect(res.body.sub).toBe(idClaims.sub);

    // email·profile scope 를 요청 안 했으니 그 claim 은 없어야 함
    expect(res.body.email).toBeUndefined();
    expect(res.body.email_verified).toBeUndefined();
    expect(res.body.name).toBeUndefined();
  });
});
