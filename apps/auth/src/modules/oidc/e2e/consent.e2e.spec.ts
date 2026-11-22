import 'dotenv/config'; // env 검사(oidc-config)보다 먼저 .env 를 읽어야 해서 맨 위

import { DATABASE, type Database } from '@/database/database.types';
import { oidcAuthorizationCodes, oidcClients } from '@/database/schema';
import type { INestApplication } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { REDIRECT_URI, createPkce, createTestApp } from './helpers';

// 동의를 "생략하지 않는" 테스트 전용 client (shop 은 skipConsent=true 라 동의 테스트에 못 씀)
// 준비 단계라 DB 로 직접 등록하고, 끝나면 지운다. secret 은 테스트 안에서만 쓰는 랜덤값
const CONSENT_CLIENT_ID = 'e2e-consent-client';
const CONSENT_CLIENT_SECRET = crypto.randomBytes(32).toString('base64url');

describe('OIDC consent (e2e)', () => {
  let app: INestApplication;
  let db: Database;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(DATABASE);

    await db
      .insert(oidcClients)
      .values({
        clientId: CONSENT_CLIENT_ID,
        name: 'E2E Consent',
        redirectUris: [REDIRECT_URI],
        clientSecretHash: await bcrypt.hash(CONSENT_CLIENT_SECRET, 10),
        skipConsent: false,
      })
      .onConflictDoNothing(); // 지난 실행이 중간에 죽어서 남아 있어도 괜찮게
  });

  afterAll(async () => {
    // code 행이 client 를 참조하니까 code 먼저 지운다
    await db
      .delete(oidcAuthorizationCodes)
      .where(eq(oidcAuthorizationCodes.clientId, CONSENT_CLIENT_ID));
    await db
      .delete(oidcClients)
      .where(eq(oidcClients.clientId, CONSENT_CLIENT_ID));
    await app.close();
  });

  it('1. 처음 보는 user+client → code 대신 동의 화면으로 302', async () => {
    const { codeChallenge } = createPkce();

    // ① /authorize 요청 (getCode 는 code 를 꺼내 버리니까 여기선 직접 request)
    //    client_id 는 CONSENT_CLIENT_ID (동의 생략 안 하는 client). 이 client 는 매번 새로 등록되니 저장된 동의도 없음

    // ② expect: 302
    // ③ expect: Location 이 RP(redirect_uri) 가 아니라 동의 화면 주소
    // ④ expect: Location 에 code 없음
    void codeChallenge;
  });

  it.todo('2. 허용 → code 발급, 그 code 로 받은 토큰의 scope = 허락한 scope');
  it.todo('3. 거부 → 302 error=access_denied (+ state 그대로), code 없음');
  it.todo('4. 이미 동의한 scope 범위 안 → 동의 화면 없이 바로 code');
  it.todo('5. 더 넓은 scope 요청 → 다시 동의 화면');
  it.todo('6. 일부만 허용 (email O, profile X) → /userinfo 에 name 없음');
  it.todo('7. 동의 생략 client → 동의 화면 없이 바로 code');
});
