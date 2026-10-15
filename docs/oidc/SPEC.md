# OIDC 직접 구현 학습 스펙

> better-auth 의 OIDC 제공자 기능을 걷어내고 IdP/RP 를 **직접** 구현하며 OIDC 를 배운다.
> 이 문서는 학습 진행 상태의 단일 기준(source of truth)이다. 새 세션은 이 문서부터 읽는다.

## 1. 학습자 & 멘토링 규칙

- 학습자: OIDC 완전 초보. JWT 개념은 앎.
- 멘토(Claude) 역할: **길잡이**. 정답 코드를 먼저 주지 않는다.
  1. 단계마다 개념 + "무엇을 만들어야 하는지"(요구사항/검증 항목)만 설명
  2. 학습자가 직접 구현
  3. 멘토가 리뷰 — 특히 보안 검증 누락을 짚는다
  4. 막히면 힌트를 단계적으로(개념 → 방향 → 의사코드 → 코드). 코드는 최후 수단
- 단계 시작 전 확인 질문으로 이해도 점검 → 설명 깊이 조절
- 진행할 때마다 §7 진행 상태, §8 학습 로그, §9 오답 노트를 갱신한다
- **구현 단계(1~)의 과제·체크리스트·코드 리뷰 기록은 `docs/oidc/stages/stage-N-*.md` 에 단계별로 따로 둔다.**
  이 문서(SPEC)에는 로드맵, 진행 상태, 학습 로그, 오답 노트만 남긴다
- **복습 규칙**: 학습자가 "단계 N 복습하자"라고 하면 §9 에서 그 단계의 미해결(❌/△) 항목을 찾아
  **같은 질문을 반복하지 말고 응용 질문**(상황 바꾸기, 공격 시나리오, "이게 없으면 무슨 일이?" 등)으로 다시 낸다.
  맞히면 해당 항목에 복습 날짜와 ✅ 를 기록, 또 틀리면 날짜와 함께 ❌ 를 추가한다

## 2. 범위

### Phase 1 — OIDC 제공자 직접 구현 (현재 목표)
- 회원가입/로그인/세션/이메일 인증 등 **회원 기능은 better-auth 유지**
- IdP 는 "지금 로그인한 사용자가 누구인가"만 better-auth 세션에서 얻는다
- 그 외 OIDC 엔드포인트·토큰 발급·검증은 전부 직접 구현
- better-auth 의 `jwt()`, `oauthProvider()` 플러그인은 직접 구현이 대체한 뒤 제거

### Phase 2 — 회원/세션까지 직접 구현 (Phase 1 완료 후)
- 비밀번호 해싱, 세션 쿠키, 이메일 인증, 재설정 등 직접 구현 → better-auth 완전 제거
- 세부 스펙은 Phase 1 끝난 뒤 작성

### 범위 밖 (YAGNI)
- Implicit / Hybrid flow (보안상 비권장, 학습 가치 낮음)
- Dynamic Client Registration
- Front-channel / Back-channel logout (필요해지면 추가)
- `private_key_jwt` client 인증 (`client_secret_basic` 만)

## 3. 기술 결정

| 항목 | 결정 | 이유 |
|---|---|---|
| JWT 서명/검증 | `jose` (이미 설치됨) | 암호 원시연산 직접 구현은 학습 목표 아님 + 사고 위험 |
| 서명 알고리즘 | RS256 | OIDC 필수 지원 알고리즘 |
| Flow | Authorization Code + PKCE(S256) | 현재 권장 표준 |
| Client 인증 | `client_secret_basic` | 가장 단순한 표준 방식 |
| IdP 서버 | `apps/auth` (NestJS) | 기존 구조 |
| 로그인/동의 UI | `apps/auth/web` (Next.js) | 기존 구조 |
| 테스트 RP | `apps/rp` (Next.js, 포트 4000, 최소 구성) — [stages/stage-1-rp.md](stages/stage-1-rp.md) | IdP 를 눌러보는 용도. 실제 서비스 RP 는 별도 레포 |
| IdP 테스트 방법 | 테스트 RP + 필요하면 `curl` | |
| issuer (직접 구현) | `http://localhost:3001/api/oidc` | better-auth(`/api/auth`)와 겹치지 않게 공존. 단계 10 에서 정리 |
| DB | Postgres + Drizzle | 기존 구조 |
| 브랜치 | `feature/oidc` 에서 학습용 브랜치 분기 | |

## 4. 핵심 흐름 (Authorization Code + PKCE)

```
브라우저 → RP:   "로그인" 클릭
RP:              state, nonce, code_verifier 생성 → 쿠키에 저장
RP → 브라우저:   302 → IdP/authorize?response_type=code&client_id&redirect_uri
                        &scope=openid profile email&state&nonce
                        &code_challenge&code_challenge_method=S256
브라우저 → IdP:  /authorize — 미로그인 → 로그인 화면 → 다시 /authorize
                            — 미동의 → 동의 화면 → 다시 /authorize
IdP → 브라우저:  302 → RP/callback?code&state
RP:              state 일치 확인
RP → IdP:        POST /token (code, redirect_uri, code_verifier, Basic 인증)   ← 서버 간 통신
IdP → RP:        { id_token, access_token, refresh_token?, expires_in, token_type }
RP:              id_token 검증(JWKS) → nonce 확인 → sub 로 RP 자체 세션 생성
```

## 5. 단계별 요구사항 (Phase 1)

각 단계의 **완료 조건** 체크리스트를 모두 만족해야 다음 단계로 간다.

### 단계 0 — 흐름 이해 (코드 없음)
확인 질문:
1. 토큰을 브라우저에 바로 주지 않고 code 를 거치는 이유는?
2. `state` 는 무엇을 막는가?
3. ID Token 과 Access Token 의 용도 차이는? (누가 읽고, 누구에게 보내는가)
4. RP 는 id_token 서명을 무엇으로 검증하며, 그 키는 어디서 얻는가?

### 단계 1 — 테스트용 RP (`apps/rp`)
- 과제·체크리스트·리뷰 기록 → [stages/stage-1-rp.md](stages/stage-1-rp.md)
- 실제 서비스 RP 는 별도 레포. 이건 IdP 를 눌러보는 용도

### 단계 2 — Discovery `GET /.well-known/openid-configuration`
- [ ] `issuer`, `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`, `jwks_uri`
- [ ] `response_types_supported`, `subject_types_supported`, `id_token_signing_alg_values_supported`
- [ ] `scopes_supported`, `code_challenge_methods_supported`, `token_endpoint_auth_methods_supported`
- [ ] `issuer` 값은 이후 발급하는 모든 토큰의 `iss` 와 **정확히** 일치
- [ ] `curl` 로 받아서 각 주소가 실제로 열리는지 확인
- 스펙: OIDC Discovery 1.0 §3, §4

### 단계 3 — 서명키 & `GET /jwks`
- [ ] RS256 키쌍 생성·저장 (개인키는 절대 응답에 포함 금지, DB 저장 시 암호화 고려)
- [ ] JWKS 응답: 공개키만, 각 키에 `kid`, `kty`, `alg`, `use: "sig"`
- [ ] 키 교체(rotation) 시 이전 공개키를 잠시 함께 노출해야 하는 이유 설명 가능
- 스펙: RFC 7517

### 단계 4 — `GET /authorize`
- [ ] `client_id` 존재 확인
- [ ] `redirect_uri` 가 등록값과 **정확히 일치** (부분 일치·prefix 금지)
- [ ] client_id/redirect_uri 가 틀리면 **redirect 하지 말고** 에러 화면 (open redirect 방지)
- [ ] 그 외 에러는 `redirect_uri?error=...&state=...` 로 돌려줌
- [ ] `response_type=code`, `scope` 에 `openid` 포함 확인
- [ ] PKCE: `code_challenge` 필수, method `S256` 만 허용
- [ ] 미로그인 → 로그인 화면으로 보내고, 로그인 후 원래 요청으로 복귀
- [ ] code 발급: 충분히 긴 랜덤, **1회용**, 짧은 만료(≤ 10분, 권장 1분)
- [ ] code 에 묶어 저장: client_id, redirect_uri, user_id, scope, nonce, code_challenge, auth_time
- 스펙: RFC 6749 §4.1.1–4.1.2, OIDC Core §3.1.2

### 단계 5 — `POST /token` (grant_type=authorization_code)
- [ ] Client 인증 (`Authorization: Basic`), secret 은 해시 저장·상수시간 비교
- [ ] code 존재·미사용·미만료·**발급받은 client 와 동일** 확인
- [ ] `redirect_uri` 가 authorize 때 값과 동일
- [ ] PKCE: `BASE64URL(SHA256(code_verifier)) == code_challenge`
- [ ] code 즉시 소진. 이미 쓴 code 재사용 시 그 code 로 발급한 토큰 폐기 고려
- [ ] ID Token claims: `iss`, `sub`, `aud`(=client_id), `exp`, `iat`, `auth_time`, `nonce`(요청 시)
- [ ] scope 에 따라 `email`, `email_verified`, `name`, `picture` 등 포함
- [ ] 응답 헤더 `Cache-Control: no-store`
- [ ] 발급된 id_token 을 jwt.io 등으로 열어 claim 확인 (RP 쪽 검증은 stage-1-rp.md 의 나중 단계 항목)
- 스펙: OIDC Core §3.1.3, RFC 6749 §4.1.3, RFC 7636 §4.6

### 단계 6 — PKCE 점검
- [ ] PKCE 없이/틀린 verifier 로 요청 시 거부되는 것을 직접 확인
- [ ] PKCE 가 막는 공격(code 가로채기) 설명 가능
- 스펙: RFC 7636

### 단계 7 — `GET /userinfo`
- [ ] `Authorization: Bearer <access_token>` 검증 (서명·만료·`aud`/issuer)
- [ ] 토큰의 scope 에 따라 claim 반환, `sub` 는 id_token 과 동일
- 스펙: OIDC Core §5.3

### 단계 8 — 동의(consent)
- [ ] 처음 접근하는 client + scope 조합이면 동의 화면
- [ ] 동의 저장 → 다음엔 생략. 더 넓은 scope 요청 시 다시 동의
- [ ] 계정 화면에서 동의 철회 (기존 `services-section` 연결)

### 단계 9 — Refresh token & 로그아웃
- [ ] `offline_access` scope 일 때만 refresh token 발급
- [ ] `grant_type=refresh_token`: rotation (쓸 때마다 새로 발급, 옛 것 폐기), 재사용 감지 시 계열 전체 폐기
- [ ] RP-Initiated Logout (`end_session_endpoint`, `id_token_hint`, `post_logout_redirect_uri` 등록값 일치)
- 스펙: RFC 6749 §6, RFC 9700(OAuth 2.0 Security BCP), OIDC RP-Initiated Logout 1.0

### 단계 10 — better-auth OIDC 플러그인 제거
- [ ] `jwt()`, `oauthProvider()` 제거, 관련 테이블 마이그레이션 정리
- [ ] web 의 consent/services 화면을 새 API 로 연결
- [ ] 기존 기능 회귀 확인

## 6. 데이터 모델 (초안 — 단계 진행하며 학습자가 확정)

| 테이블 | 핵심 컬럼 | 도입 단계 |
|---|---|---|
| `oidc_signing_key` | kid, public_jwk, private_jwk(암호화), created_at, active | 3 |
| `oidc_client` | client_id, client_secret_hash, redirect_uris[], post_logout_redirect_uris[], name | 4 |
| `oidc_authorization_code` | code_hash, client_id, user_id, redirect_uri, scope, nonce, code_challenge, expires_at, used_at | 4 |
| `oidc_consent` | user_id, client_id, scopes[], created_at | 8 |
| `oidc_refresh_token` | token_hash, family_id, client_id, user_id, scope, expires_at, revoked_at | 9 |

기존 better-auth 의 `jwks`, `oauth_*` 테이블은 단계 10 에서 정리.

## 7. 진행 상태

- 현재 단계: **단계 1** 테스트용 RP (2026-10-15 시작)
- 학습 브랜치: `feature/oidc` (별도 브랜치 없이 진행)

| 단계 | 상태 |
|---|---|
| 0 흐름 이해 | ✅ (약점 복습 계속: 세션 쿠키 내용, 상황 문제 끝까지 답하기, 비교 주체) |
| 1 테스트용 RP | ⏳ 진행 중 → [stages/stage-1-rp.md](stages/stage-1-rp.md) |
| 2 Discovery | ⬜ 과제 준비됨 → [stages/stage-2-discovery.md](stages/stage-2-discovery.md) |
| 3 JWKS | ⬜ |
| 4 authorize | ⬜ |
| 5 token | ⬜ |
| 6 PKCE | ⬜ |
| 7 userinfo | ⬜ |
| 8 consent | ⬜ |
| 9 refresh/logout | ⬜ |
| 10 better-auth 제거 | ⬜ |

## 8. 학습 로그

> 단계마다: 날짜, 학습자가 이해한 것, 헷갈렸던 것, 리뷰에서 나온 지적. 다음 세션의 설명 깊이 조절에 쓴다.

- 2026-10-12: 학습 시작. 스펙 작성. 단계 0 확인 질문 제시.
- 2026-10-12: 단계 0 답변. state=CSRF 는 정답. code 의 존재 이유, ID/Access Token 방향,
  JWKS 서명 검증은 아직 모름 → 해설 후 오답 노트 기록. 특히 토큰의 **방향(누가 발급, 누가 받음)** 을 헷갈림.
- 2026-10-12: 후속 질문에서 "secret 으로 code 를 연다"는 오개념 발견(0-5). 서명 ≠ 암호화 구분이 약함.
  공개키/개인키를 도장·인감 비유로 재설명, id_token 처리 5단계 설명. 응용 질문 3개 출제.
- 2026-10-12: 응용 결과 Q1 ❌ Q2 ❌ Q3 ✅. 서명 검증 원리가 와닿지 않음 → 토이 RSA 숫자 예시로 설명.
  kid 오개념(0-7) 기록. 다음: jose 로 서명/검증/위조 실습(선택) 후 단계 0 재점검.
- 2026-10-12: 실습은 보류(학습자 요청). "공개키로 푼다" → "확인한다"로 교정(내용은 누구나 읽음).
  `sub` 가 뭔지 질문 → 설명함(IdP 내 불변 사용자 ID, email 대신 (iss, sub) 로 식별). 복습 때 sub vs email 응용 질문 후보.
- 2026-10-12: "공개키로 개인키를 역산하면 뚫리지 않나?" 질문 → 토이 n=33 은 인수분해로 역산 가능, 2048비트는 사실상 불가능하다고 설명.
  실제 위협은 수학이 아니라 개인키 유출과 RP 검증 실수(`alg: none`, 알고리즘 혼동) → 단계 5 에서 RP 가 alg 를 RS256 으로 고정하도록 다룰 것.
- 2026-10-12: 수학 설명이 와닿지 않음 → **수식 대신 비유로 설명할 것**(곱셈↔소인수분해, 스무디). 구현에 수학 이해는 불필요, 규칙만 기억하면 됨을 강조.
- 2026-10-13: 단계 0 복습 출제 (답 대기). R1→0-1, R2→0-5, R3→0-3(방향+iss/aud), R4→0-4·0-7(키 교체), R5→0-6, R6→sub vs email.
- 2026-10-13: 복습 문제를 머릿속에 그리지 못함 → OIDC 개념 전체를 **놀이공원 비유 그림 설명서**로 제작:
  https://claude.ai/artifact/XQvJF897TxoqfGLak7Zg7K (철수=사용자, 놀이공원=RP, 주민센터=IdP, 번호표=code, 신분증=id_token,
  출입증=access_token, 도장/견본=개인키/공개키, 도장 이름표=kid, 손목밴드=세션, 짝꿍 쪽지=state). 앞으로 설명은 이 비유를 재사용.
- 2026-10-13: 질문 "client_id 는 비어있나? 누가 주나? state 는 IdP 가 주나? 로그인 클릭이 RP 서버에서 일어나나?"
  → client_id 는 IdP 가 사전 등록 때 발급, RP 가 설정에 보관해 URL 에 넣음(공개값). state 는 **RP 가 생성**(오개념 0-8).
  로그인 클릭은 RP 서버(/login)로 먼저 감 → RP 서버가 state 생성·쿠키 저장 후 302. 그림 설명서에 반영.
- 2026-10-13: "구글은 RP 를 미리 알 수 없는데 client_id 를 어떻게 등록하나" 혼란 → RP **개발자가 직접** IdP(구글 콘솔)에
  셀프 등록한다고 설명. '등록하는 사람 = IdP 쪽 개발자'로 오해했음. 구글 예시가 잘 통할 것 같음.
- 2026-10-13: 학습자가 개인 노트로 용어·흐름 1~4 정리 → 대부분 정확. 교정: state 를 "RP 가 idp 로 전달"로만 적음(누가 만들고
  누가 비교하는지 빠짐, 0-8 재발 위험), "RP 브라우저" 표현(브라우저는 사용자 것), authorize 의 결과(code 발급) 누락.
- 2026-10-13: "client_id 를 URL 에 넣어도 되나?" → 공개값(이름표)이라 괜찮고, 비밀은 client_secret 뿐이라고 설명.
  막는 장치: redirect_uri 화이트리스트, client_secret, PKCE. 이어서 PKCE 질문 → verifier/challenge 원리, state 와의 차이
  (state=남의 code 주입 막기·RP 가 확인, PKCE=내 code 탈취 막기·IdP 가 확인) 설명. 단계 1 에 RP 쪽 PKCE 생성 항목 추가.
- 2026-10-13: 단계 0 복습 R1~R6 채점: R1 ❌(CSRF 와 혼동), R2 ✅, R3 (1)✅ (2)❌(iss), R4 미응답, R5 △(세션 쿠키 이름 모름), R6 ❌(전제 놓침).
  다음 복습 우선순위: iss vs aud, 토큰이 브라우저로 새는 위험 vs CSRF 구분, 세션 쿠키, R4(키 교체).
- 2026-10-13: R4 재응답 ✅. R5 후속에서 "id_token 을 쿠키로 굽는다" 오개념(0-11). R3 후속 "도메인이 다를 수도" → issuer 는 설정값과 정확히 일치 비교.
- 2026-10-13: 아몬드영 서버(~/github/almondyoung-server) 비교. user-service 가 자체 IdP, admin-web 이 RP.
  RP 는 state·nonce·PKCE·state 비교·code 교환·id_token 검증(iss/aud/RS256 고정)까지 교과서대로. 차이: 세션 ID 대신
  IdP 토큰을 쿠키로 저장(로그아웃 즉시성 약함), id_token 없으면 검증 생략, 백엔드가 레거시 HS256 도 허용. 단계 1~5 구현 때 참고 자료로 쓸 것.
- 2026-10-13: 질문 "세션 DB 조회는 느리지 않나, JWT 장점이 퇴색하나" → 조회 비용(Redis ~1ms 미만, PK 조회 수 ms)은 페이지 처리 대비 미미.
  JWT 장점은 '무결성'이 아니라 '조회 없는(stateless) 검증'이고 대가는 즉시 폐기 불가. 무결성은 세션 방식에서도 문제없음(서버가 원본 보유).
  "RP 의 여러 백엔드" = 한 RP 서비스가 주문/결제/회원 서버로 쪼개진 구조(아몬드영 admin-web → core/wallet/membership).
- 2026-10-15: 단계 0 2차 복습 출제 (답 대기, 쉬운 문장·단계 번호 없이). Q1→0-1(공용 PC 기록: code vs id_token), Q2→0-3(iss/aud 두 토큰),
  Q3→0-8(state 생성·비교 주체), Q4→0-9(친구 앱 등록), Q5→0-6·0-11(세션 쿠키), Q6→0-10(이메일 변경), Q7→state vs PKCE 비교 주체. 복습 후 단계 1 코드 시작 예정.
- 2026-10-15: 2차 복습 채점 Q1 ✅ Q2 ✅ Q3 △ Q4 △ Q5 △ Q6 △ Q7 미응답(→ 해설: state 는 RP 가, PKCE 는 IdP 가 /token 에서 비교).
  패턴: 상황 문제에 원칙만 답하고 결과를 안 씀. 세션 쿠키에 정보가 들어 있다고 여김. 단계 0 완료 처리, 단계 1 시작(apps/rp, 포트 4000).
  기존 포트: web 3000, auth 3001, mail 3002.
- 2026-10-15: 범위 변경 — 이 레포는 IdP 만. RP 는 별도 레포에서(단계 1 과제는 rp-guide.md 로 이동). IdP 는 브라우저+curl 로 테스트.
  직접 구현 issuer 는 `/api/oidc` 로 두어 better-auth `/api/auth` 와 공존. 단계 2(Discovery)부터 시작.
- 2026-10-15: 다시 변경 — 이 레포에 **테스트용 RP(`apps/rp`)** 를 만들기로 함. 실제 서비스 RP 는 별도 레포. 단계 1 부활, 단계 2 과제는 미리 준비해 둠.

## 9. 오답 노트 (복습용)

> 상태: ✅ 정답 · △ 부분 정답 · ❌ 오답/모름. 복습할 때마다 `→ 날짜 결과` 를 이어 붙인다.
> 응용 질문은 아래 "핵심 포인트"를 다른 각도에서 묻는다.

### 단계 0 — 흐름 이해

| # | 날짜 | 질문 | 학습자 답 | 상태 | 핵심 포인트 (정답) | 복습 이력 |
|---|---|---|---|---|---|---|
| 0-1 | 2026-10-12 | 토큰 대신 code 를 거치는 이유 | "등록된 RP 인지 확인하려고?" | △ | 브라우저(front-channel)는 URL 이 히스토리·Referer·로그·확장프로그램으로 새는 **불안전한 통로**다. 그래서 거기엔 단독으로 쓸모없는 1회용 code 만 싣는다. 토큰은 서버 간(back-channel)에서 client_secret(+PKCE)으로 **RP 를 인증한 뒤에만** 받는다. 답의 "RP 확인"은 token 단계의 client 인증 부분이라 반은 맞음 | 2026-10-13 복습 R1(callback 으로 id_token 직접 전달) → ❌ "CSRF 에 취약". CSRF 는 state 담당. 정답: 토큰이 주소창·기록·Referer 로 새고, 주운 사람이 secret 없이 바로 사용 가능 / 2026-10-15 Q1(공용 PC 기록) → ✅ code 는 1회용·만료라 실패, id_token 은 성공 가능. (secret 필요 언급은 빠짐) |
| 0-2 | 2026-10-12 | `state` 의 목적 | "CSRF 방지" | ✅ | 공격자가 자기 code 를 담은 callback URL 을 피해자 브라우저에 열게 하면, 피해자가 **공격자 계정으로 로그인**된다(login CSRF). RP 가 보낸 요청과 돌아온 callback 을 state 로 묶어 막는다 | |
| 0-3 | 2026-10-12 | ID Token vs Access Token | "ID Token 은 RP 가 IdP 에 보내고, 등록돼 있으면 Access Token 발급" | ❌ | **둘 다 IdP 가 발급해서 RP 에게 준다.** ID Token: RP 가 직접 읽는 "누가 로그인했나" 증명서(`aud`=RP 의 client_id). API 에 보내면 안 됨. Access Token: RP 가 API(예: /userinfo)에 `Bearer` 로 보내는 **출입증**. RP 는 내용을 해석하지 않는다. 인증(누구냐) vs 인가(뭘 해도 되냐) | 2026-10-12 응용 Q3(타 RP 의 id_token 재사용) → ✅ `aud` 확인 정답. 단 처음에 "발급처?"라고 해 `iss`(발급자)와 `aud`(수신자) 구분이 약함 / 2026-10-13 복습 R3 (1) 발급 방향 IdP→RP ✅ (2) iss=evil.com 토큰을 "받는다" ❌ → iss 가 우리 IdP 가 아니면 거절. aud=shop 만 보고 통과시킴 (iss/aud 역할 구분 아직 약함). 후속: "IdP 도메인이 다를 수도 있지 않나" → RP 는 신뢰할 issuer 를 설정에 **정확한 문자열**로 갖고 있고 완전 일치만 통과, 라고 설명 / 2026-10-15 Q2 → ✅ A 는 aud, B 는 iss 로 거절. iss/aud 구분 해결 |
| 0-4 | 2026-10-12 | id_token 서명 검증 키와 출처 | "모르겠다" | ❌ | IdP 는 **개인키**로 서명하고, RP 는 IdP 의 **공개키**로 검증한다. 공개키는 discovery 문서의 `jwks_uri`(`/jwks`)에서 가져오고, JWT 헤더의 `kid` 로 어떤 키인지 고른다. 공개키라 누구나 받아도 안전하다 | 2026-10-12 응용 Q2(공격자가 자기 개인키로 서명) → ❌ 모름. 토이 RSA 숫자 예시로 재설명 / 2026-10-13 복습 R4(옛 공개키 삭제) → ✅ "검증이 안 됨" |
| 0-5 | 2026-10-12 | (0-1 해설 후 후속 질문에서 드러난 오개념) code 를 RP 가 어떻게 쓰나 | "RP 가 시크릿키로 code 를 여는 것?" | ❌ | code 는 **암호화된 것이 아니라 그냥 랜덤 문자열(번호표)**. RP 는 아무것도 열지 않고 code + client_id + client_secret 을 **IdP 의 /token 에 같이 보낸다**. IdP 가 DB 에서 code 를 찾아 "이 code 를 받은 client 가 맞나, secret 이 맞나" 확인 후 토큰을 준다. secret 은 복호화 키가 아니라 RP 의 **비밀번호** | 2026-10-12 응용 Q1(히스토리에서 code 탈취) → ❌ "code 값이 없어서"라고 답함. 공격자는 code 를 **이미 가졌다**. 없는 건 client_secret(+PKCE code_verifier). code 의 1회용·짧은 만료도 방어선 / 2026-10-13 복습 R2 → ✅ 핵심 정답(code 엔 정보 없음, IdP 가 DB 대조). 보충: "해시키"가 아니라 그냥 랜덤 문자열, secret 확인·1회용 사용 처리 언급 누락 |
| 0-6 | 2026-10-12 | (개념 질문) RP 는 id_token 을 받아서 뭘 하나 | "어떻게 처리하는지 모르겠다" | ❌ | ① JWT 헤더의 `kid` 로 JWKS 에서 공개키 선택 → ② 서명 검증 → ③ `iss`/`aud`/`exp`/`nonce` 확인 → ④ `sub` 로 RP 자체 DB 의 사용자 찾기/생성 → ⑤ **RP 자체 세션 쿠키 발급**. 그 뒤 id_token 은 더 쓰지 않는다 (호텔 체크인 때 신분증 확인 → 방 키 발급 비유) | 2026-10-13 복습 R5 → △ "RP 가 발급한 access token" 으로 답함. RP 자체 로그인 상태라는 방향은 맞지만 이름은 **세션 쿠키**. access token 은 IdP 가 발급 |
| 0-7 | 2026-10-12 | (개념 질문) JWT 헤더의 `kid` | "토큰마다 랜덤 발급? 개인키 여러 개와 매칭?" | ❌ | `kid` 는 **키 쌍의 이름표**. 키 쌍을 만들 때 한 번 정해지고(UUID 등), 그 키로 서명한 모든 토큰에 같은 kid 가 들어간다. IdP 는 보통 활성 개인키 1개로 서명하고 헤더에 그 kid 를 적는다. RP 는 JWKS(공개키 목록)에서 같은 kid 의 **공개키**를 찾는다. 매칭은 RP 쪽에서 공개키와 하는 것 | 2026-10-13 복습 R4 → ✅ (kid 로 찾을 공개키가 없어 실패 → 옛 키 잠시 유지 필요) |
| 0-8 | 2026-10-13 | (개념 질문) state 는 누가 만드나 | "state 는 IdP 가 주는 것" | ❌ | **RP 가 만든다.** RP 서버가 랜덤 state 를 만들어 쿠키에 저장하고 authorize URL 에 넣는다. IdP 는 손대지 않고 callback 에 그대로 돌려줄 뿐. RP 가 만든 값이어야 "내가 보낸 요청의 응답인가"를 RP 가 확인할 수 있다 | 2026-10-15 Q3 → △ RP 생성·IdP 그대로 반환 ✅, **비교 주체(RP)** 언급 누락 |
| 0-9 | 2026-10-13 | (개념 질문) client 등록은 누가 하나 | "구글은 RP 를 미리 모르는데 어떻게 등록?" | ❌ | 등록은 **RP 쪽 개발자가 IdP 에 셀프로** 한다. 예: 구글 로그인을 붙이려는 개발자가 Google Cloud Console 에서 OAuth 클라이언트를 만들고 redirect URI 입력 → client_id/secret 받아 자기 .env 에. IdP 에 미리 등록 안 된 RP 는 로그인 요청 자체가 거부된다 | 2026-10-15 Q4 → △ 등록·.env ✅, 받는 것에 client_id 와 redirect_uri 등록 누락(secret 만 언급) |
| 0-10 | 2026-10-13 | (복습 R6) RP 가 email 로 회원을 찾을 때, 탈퇴한 철수의 이메일로 영희가 재가입 후 로그인 | "아무 일도 없다. sub 기준이라서" | ❌ | 문제 전제가 **email 로 찾는 RP**. 영희가 로그인하면 RP 는 email 이 같으니 **철수의 RP 계정으로 로그인**시킨다 → 영희가 철수의 주문·주소·결제정보를 봄. 그래서 sub(+iss) 로 찾아야 한다. 문제 전제를 놓치고 정답 원칙만 답함 | 2026-10-15 Q6 → △ "sub 로 찾아야" 원칙만 답하고 두 경우 결과는 답 안 함(R6 과 같은 패턴). 정답: email → 못 찾아 새 회원 중복 생성·주문내역 잃음 / sub → 같은 철수, 이메일만 갱신 |
| 0-11 | 2026-10-13 | (R5 후속) RP 세션 쿠키의 정체 | "IdP 가 발급한 id_token 을 Set-Cookie 하는 것?" | ❌ | 아니다. RP 가 **자기 손으로 만든 랜덤 세션 ID** 를 쿠키로 준다. RP DB 에 `세션ID → RP 회원 id` 로 저장. id_token 은 로그인 순간 검사에만 쓰고 쿠키에 넣지 않는다(놀이공원: 신분증은 돌려주고 손목밴드를 새로 채워줌) | 보충: 이건 교과서 방식. 아몬드영 admin-web 처럼 IdP 토큰(access/refresh/id)을 그대로 쿠키에 굽는 방식도 실무에 있음 → 둘 다 존재, 장단점 차이 / 2026-10-15 Q5 → △ RP 가 만듦 ✅, 그러나 "쿠키에서 sub 를 추출" → 쿠키엔 정보 없음. 세션 테이블에서 세션ID→회원 조회. 오개념 잔존 |

## 10. 참고 스펙

- OpenID Connect Core 1.0 — https://openid.net/specs/openid-connect-core-1_0.html
- OpenID Connect Discovery 1.0 — https://openid.net/specs/openid-connect-discovery-1_0.html
- OIDC RP-Initiated Logout 1.0 — https://openid.net/specs/openid-connect-rpinitiated-1_0.html
- RFC 6749 OAuth 2.0 — https://datatracker.ietf.org/doc/html/rfc6749
- RFC 7636 PKCE — https://datatracker.ietf.org/doc/html/rfc7636
- RFC 7517 JWK — https://datatracker.ietf.org/doc/html/rfc7517
- RFC 9700 OAuth 2.0 Security BCP — https://datatracker.ietf.org/doc/html/rfc9700
