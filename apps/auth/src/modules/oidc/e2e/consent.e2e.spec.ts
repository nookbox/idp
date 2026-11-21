import 'dotenv/config'; // env 검사(oidc-config)보다 먼저 .env 를 읽어야 해서 맨 위

import type { INestApplication } from '@nestjs/common';
import { createPkce, createTestApp } from './helpers';

// 동의(consent) (단계 8) — docs/oidc/stages/stage-8-consent.md ① 목록
// 아직 정할 것: 동의 화면 주소, 그 화면이 "어떤 요청"인지 아는 방법 → 정한 뒤 1번부터 채운다
describe('OIDC consent (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. 처음 보는 user+client → code 대신 동의 화면으로 302', async () => {
    const { codeChallenge } = createPkce();

    // ① /authorize 요청 (getCode 는 code 를 꺼내 버리니까 여기선 직접 request)
    //    TODO: 이 user+client 의 동의가 "없는" 상태로 시작해야 함 (준비 방법은 구현 설계 후)

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
