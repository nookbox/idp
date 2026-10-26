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
- OIDC 엔드포인트·토큰 발급·검증은 전부 직접 구현
- ~~회원 기능은 better-auth 유지~~ → **2026-10-19 better-auth 전부 제거** (서버·web·DB 테이블). DB 에는 `user` 테이블만 남김
- ⚠️ 단계 4(/authorize)는 "로그인한 사용자"가 필요하다 → ~~단계 4 전에 최소 로그인/세션을 당겨서 만든다~~ **2026-10-20 학습자 결정: 당겨오지 않음.** 로그인/세션은 Phase 2 에서. 단계 4 ③ 에서 **env `DEV_LOGIN_USER_ID` 로 개발용 사용자를 "로그인한 사람"으로 대신**(2026-10-26 결정, 없으면 미로그인 → 운영 사고 방지·테스트 용이). Phase 2 에서 그 함수 안만 진짜 세션으로 교체

### Phase 2 — 회원/세션까지 직접 구현
- 비밀번호 해싱, 세션 쿠키, 이메일 인증, 재설정 등 직접 구현
- **better-auth 제거로 같이 사라져서 다시 만들어야 하는 것**:
  - [ ] 로그인/세션 (~~단계 4 선행 조건~~ 2026-10-20 Phase 2 로 유지). 기존 비밀번호 해시(`account` 테이블)는 버림 → 회원 다시 가입
    - 세션이 생기면 바꿀 곳 2개: `CurrentUserReader.getCurrentUser` 안, `/authorize` 미로그인 처리(지금 임시 `error=login_required` 302 → 로그인 화면 redirect 후 4번 복귀. `login_required` 는 `prompt=none` 전용으로 남김)
  - [ ] `user` 테이블 재설계 — 로그인 만들 때 같이 (비밀번호 해시 컬럼 추가, admin 플러그인 잔재 `role`/`banned`/`ban_reason`/`ban_expires` 정리). 단계 3 은 user 를 안 쓰므로 그 전엔 손대지 않음
  - [ ] 전역 인증 가드 + `@AllowAnonymous()` (짝으로 같이). **지금은 가드가 없어서 모든 API 가 공개**
  - [ ] web 화면: 로그인·회원가입·비밀번호 재설정·계정·동의 (git 히스토리 `9fd9858` 에 이전 UI 있음)
  - [ ] 아바타 업로드 컨트롤러 (`AvatarsService` 는 남겨둠, 세션 생기면 컨트롤러만 복원)
  - [ ] 이메일 인증/OTP (`lib/mailer.ts`, `packages/email` 은 남겨둠)
  - [ ] RP 등록 스크립트 (`seed-oauth-client.ts` 삭제됨 → 단계 4 의 `oidc_client` 로 대체)
- **OIDC 운영 기능** (Phase 1 로 id_token 을 실제 발급해 본 뒤):
  - [ ] 서명키 교체(rotation) — 새 키 비활성 추가 → RP 캐시 갱신 대기 → 활성 전환 → 옛 키는 토큰 만료 후 삭제. 준비된 것: /jwks 가 옛 키 포함, `active` 기본값 false (2026-10-20 단계 3)

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
| RP | **이 레포에서 만들지 않음** (테스트 RP 포함). 실제 RP 는 별도 레포 → [rp-guide.md](rp-guide.md) | IdP 에만 집중 (2026-10-15 결정) |
| IdP 테스트 방법 | 브라우저 주소창 + `curl` 로 직접 요청 | |
| issuer (직접 구현) | `http://localhost:3011/api/oidc` | better-auth 제거 후에도 유지 |
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

### 단계 1 — (범위 밖) RP
- 이 레포에서는 하지 않는다 → [rp-guide.md](rp-guide.md)

### 단계 2 — Discovery `GET /.well-known/openid-configuration`
- [ ] `issuer`, `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`, `jwks_uri`
- [ ] `response_types_supported`, `subject_types_supported`, `id_token_signing_alg_values_supported`
- [ ] `scopes_supported`, `code_challenge_methods_supported`, `token_endpoint_auth_methods_supported`
- [ ] `issuer` 값은 이후 발급하는 모든 토큰의 `iss` 와 **정확히** 일치
- [ ] `curl` 로 받아서 각 주소가 실제로 열리는지 확인
- 스펙: OIDC Discovery 1.0 §3, §4

### 단계 3 — 서명키 & `GET /jwks`
- [x] RS256 키쌍 생성·저장 (개인키는 절대 응답에 포함 금지, DB 저장 시 암호화 고려)
- [x] JWKS 응답: 공개키만, 각 키에 `kid`, `kty`, `alg`, `use: "sig"`
- [x] 키 교체(rotation) 시 이전 공개키를 잠시 함께 노출해야 하는 이유 설명 가능
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
- [ ] 발급된 id_token 을 jwt.io 등으로 열어 claim 확인 (RP 쪽 검증은 rp-guide.md)
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

### 단계 10 — better-auth 제거 ✅ (2026-10-19 앞당겨 완료)
- [x] better-auth 전부 제거, 마이그레이션 `0006_remove_better_auth.sql` (user 외 테이블 DROP)
- [ ] web 의 consent/services 화면을 새 API 로 연결 → Phase 2 목록으로 이동

## 6. 데이터 모델 (초안 — 단계 진행하며 학습자가 확정)

| 테이블 | 핵심 컬럼 | 도입 단계 |
|---|---|---|
| `jwks` | kid, public_jwk, private_jwk(암호화), created_at, active | 3 |
| `oidc_clients` | client_id, client_secret_hash, redirect_uris[], post_logout_redirect_uris[], name | 4 |
| `oidc_authorization_code` | code_hash, client_id, user_id, redirect_uri, scope, nonce, code_challenge, expires_at, used_at | 4 |
| `oidc_consent` | user_id, client_id, scopes[], created_at | 8 |
| `oidc_refresh_token` | token_hash, family_id, client_id, user_id, scope, expires_at, revoked_at | 9 |

better-auth 테이블은 2026-10-19 에 `user` 만 남기고 제거.

## 7. 진행 상태

- 현재 단계: **단계 4 authorize — ①②③ 완료** → 다음 ④ code 테이블+발급 (할 일: [stage-4 "다음 작업"](stages/stage-4-authorize.md)) (로그인/세션은 당겨오지 않음, 2026-10-20 결정)
- 학습 브랜치: `feature/oidc` (별도 브랜치 없이 진행)

| 단계 | 상태 |
|---|---|
| 0 흐름 이해 | ✅ (약점 복습 계속: 세션 쿠키 내용, 상황 문제 끝까지 답하기, 비교 주체) |
| 1 RP | ⏭ 범위 밖 (이 레포는 IdP 만) |
| 2 Discovery | ✅ → [stages/stage-2-discovery.md](stages/stage-2-discovery.md) |
| 3 JWKS | ✅ 완료 (2026-10-20) → [stages/stage-3-jwks.md](stages/stage-3-jwks.md) |
| 4 authorize | ⏳ 진행 중 → [stages/stage-4-authorize.md](stages/stage-4-authorize.md) |
| 5 token | ⬜ |
| 6 PKCE | ⬜ |
| 7 userinfo | ⬜ |
| 8 consent | ⬜ |
| 9 refresh/logout | ⬜ |
| 10 better-auth 제거 | ✅ (2026-10-19, 앞당김) |

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
- 2026-10-15: 테스트 RP 는 학습자 요청으로 멘토가 구현(Next.js 대신 의존성 없는 `apps/rp/server.mjs`). 학습 대상은 IdP. 학습자는 RP 코드 읽기 과제 후 단계 2 진행.
- 2026-10-15: 테스트 RP 도 삭제하고 **IdP 에만 집중**하기로 확정. RP 메모는 rp-guide.md. 테스트는 브라우저+curl.
  주의: 로컬 3001 포트를 아몬드영 서버가 쓰고 있었음 → 우리 IdP 를 띄울 때 포트 충돌 확인 필요.
- 2026-10-15: 단계 2 discovery 구현(구글 예시 붙여넣기 → 멘토가 미지원 항목 제거·issuer 조립). 학습자가 zod 로 `OIDC_ISSUER`(url, 끝 `/` 금지) 검증 추가 — 좋음.
  PKCE plain 질문 △(2-1). code_challenge 흐름이 그려지지 않음 → 스무디·자물쇠 비유 모두 안 통함.
  **비유보다 시퀀스 다이어그램이 통함**. 학습자 요청으로 앞으로 흐름 설명은 학습자 위키 그림(1~11번)을 기준으로 함:
  https://github.com/nookbox/idp/wiki/%EA%B8%B0%EB%A1%9D-oidc-%EC%A0%95%EB%A6%AC (PKCE·nonce 는 빠져 있음 → 단계 4~6 에서 그 번호에 끼워 설명).
  PKCE plain 질문(2-1) 복습은 단계 6 으로 미룸.
- 2026-10-15: 로컬 IdP 포트를 **3011** 로 변경(.env 만, 운영은 3001 유지). `OIDC_ISSUER` 를 `http://localhost:3011/api/oidc` 로 수정.
- 2026-10-19: discovery 가 401 → better-auth 전역 가드 때문. 라이브러리 `@AllowAnonymous()` 로 공개 처리하기로 함.
  직접 만든 데코레이터는 better-auth 가드가 못 알아봐서 무의미 → Phase 2 에서 가드와 함께 직접 구현. §2 Phase 2 목록에 추가.
- 2026-10-19: 단계 2 완료. 생각해볼 질문 Q1(single source of truth) ✅, Q2(iss 끝 `/`) △ — 결과를 "실패"로만 답하고 범위(전체 사용자)·이유(완전 일치 비교)는 빠짐. 상황 문제에 결과를 끝까지 안 쓰는 패턴 계속.
- 2026-10-19: 단계 3 시작 전 확인 Q1 ✅ Q2 ❌("공개키를 개인키에 대입"). 개인키 = 도장 자체라 위조 서명이 가능하다는 점이 약함. 과제 문서 stages/stage-3-jwks.md 작성.
  설명할 때 "위키"는 "정리 문서 N번(단계 이름)"으로 풀어 쓸 것(학습자가 '위키'가 뭔지 헷갈림).
- 2026-10-19: 학습자 결정 — 서명키 테이블을 `jwks` 로 쓰고 싶어서 **better-auth 전부 제거**. 로그인 불가 상태 감수. 단계 4 전에 최소 로그인/세션 직접 구현 필요.
- 2026-10-19: 단계 3 ① 중 "`d` 가 /jwks 에 섞이면?" → "모르겠다". Q2(개인키 유출) 2회째 실패. 정리 문서 9·10번 기준으로 설명(누구나 id_token 위조 → 10번 검증 통과). 단계 3 완료 때 재확인.
- 2026-10-19: 단계 3 ② 전 질문 "재시작마다 키 새로 만들면?" → "로그인한 사람 검증이 풀림 / 요청한 사람 검증 안 됨" △. 방향은 맞음. 교정: 이미 로그인한 RP 사용자는 RP 자체 세션(11번)이라 영향 없음. 깨지는 건 **재시작 전에 서명됐지만 아직 검증 전인 토큰**(9→10 사이 로그인, 나중에 검증하는 access_token, 로그아웃 id_token_hint). '누가' 범위를 정확히 짚는 연습 계속.
- 2026-10-20: 단계 3 ③ `/jwks` 완료(`{ keys }`, 공개키 6필드만). 학습자가 대화에 개인키를 붙여 넣어 → 로컬 DB 행 삭제 후 새 키로 교체. 학습자 결정 — **개인키 DB 암호화를 단계 3 에서 바로 한다**(미루지 않음).
  주의: schema 의 `active` 기본값은 `false`, 0007 마이그레이션은 `true` → 다음 `db:generate` 때 기본값이 바뀌면 insert 한 새 키가 비활성이 되어 재시작마다 키가 또 생김. insert 에서 `active: true` 를 명시하기로.
- 2026-10-23: 단계 4 ② 완료. 학습자 결정 — 서비스에서 Reader(조회)/Manager(CUD) 분리, 이번엔 Reader 만(Manager 는 ④ code 저장 때). 로거: 요청 흐름은 `AppLogger`+ctx, `onModuleInit` 은 요청이 없어 Nest 기본 `Logger`.
  1단계(throw)/2단계(302) 구분은 "redirect_uri 를 믿을 수 있나"로 이해. 질문: scope 의미, code_challenge_method, state 를 IdP 가 저장하나 → 검사는 안 하지만 정상 흐름에선 ③ 로그인 동안 **들고 가야** 한다고 설명.
  답이 길면 따라오기 어려워함 → **할 일은 짧은 번호 목록으로**.
- 2026-10-26: 테스트 RP 재검토 → 다시 안 만들기로. 단계 4 는 curl, **단계 5 부터 흐름 검증은 e2e 테스트(supertest)** 로(verifier 생성→authorize→code→token 자동화). 로그인은 env `DEV_LOGIN_USER_ID` 로 테스트에서 조절. 테스트 RP 코드는 git 기록·rp-guide.md 에 남아 있음.

## 9. 오답 노트 (복습용)

> 상태: ✅ 정답 · △ 부분 정답 · ❌ 오답/모름. 복습할 때마다 `→ 날짜 결과` 를 이어 붙인다.
> 응용 질문은 아래 "핵심 포인트"를 다른 각도에서 묻는다.

### 단계 0 — 흐름 이해

| # | 날짜 | 질문 | 학습자 답 | 상태 | 핵심 포인트 (정답) | 복습 이력 |
|---|---|---|---|---|---|---|
| 0-1 | 2026-10-12 | 토큰 대신 code 를 거치는 이유 | "등록된 RP 인지 확인하려고?" | △ | 브라우저(front-channel)는 URL 이 히스토리·Referer·로그·확장프로그램으로 새는 **불안전한 통로**다. 그래서 거기엔 단독으로 쓸모없는 1회용 code 만 싣는다. 토큰은 서버 간(back-channel)에서 client_secret(+PKCE)으로 **RP 를 인증한 뒤에만** 받는다. 답의 "RP 확인"은 token 단계의 client 인증 부분이라 반은 맞음 | 2026-10-13 복습 R1(callback 으로 id_token 직접 전달) → ❌ "CSRF 에 취약". CSRF 는 state 담당. 정답: 토큰이 주소창·기록·Referer 로 새고, 주운 사람이 secret 없이 바로 사용 가능 / 2026-10-15 Q1(공용 PC 기록) → ✅ code 는 1회용·만료라 실패, id_token 은 성공 가능. (secret 필요 언급은 빠짐) / 2026-10-20 단계 4 시작 때 "authorize 에서 진짜 토큰을 주나?" 질문 → authorize 는 code 만, 토큰은 단계 5 /token. 단계 4·5 경계가 아직 흐림 |
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

### 단계 2 — Discovery

| # | 날짜 | 질문 | 학습자 답 | 상태 | 핵심 포인트 (정답) | 복습 이력 |
|---|---|---|---|---|---|---|
| 2-1 | 2026-10-15 | PKCE `plain` 을 허용하면 authorize·callback URL 을 본 공격자가 얻는 것 | "거의 토큰을 얻은 것, IdP 정보를 얻은 것" / S256 이면 "해시가 안 맞음" | △ | plain 이면 URL 의 code_challenge 가 곧 **code_verifier** → callback 의 code 와 함께 /token 의 PKCE 검사 통과. (단 우리는 client_secret_basic 이라 secret 까지 있어야 토큰 획득 — PKCE 는 secret 이 없거나 샌 경우의 추가 방어선.) S256 이면 URL 엔 해시만 있고 해시는 되돌릴 수 없어 verifier 를 모름 → IdP 비교 실패. 흐름이 머리에 안 그려진다고 함 → 스무디 비유로 재설명 | |
| 2-2 | 2026-10-15 | (위키 흐름 기준) 주소창에 보이는 번호 | "2번, 7번" | △ | 4번(authorize URL)·7번(callback URL). 2번은 RP 서버 안이라 아무도 못 봄 | |
| 2-3 | 2026-10-15 | PKCE 비밀값 원본이 RP 밖으로 나가는 번호 | "9번" | ❌ | **8번**(RP→IdP /token, 서버끼리). 9번은 IdP→RP 응답 | |
| 2-4 | 2026-10-15 | 6번에서 code 를 훔친 도둑이 /token 에 더 필요한 것 | "state 값" | ❌ | **client_secret + PKCE 비밀값(code_verifier)**. state 는 /token 에 안 보내고, 6번 URL 에 이미 보여서 비밀도 아님. state 는 7번에서 RP 가 쿠키와 비교하는 용도 | |
| 2-5 | 2026-10-19 | 위키 8번 값 중 도둑이 모르는 것 | "client_secret, code_verifier" + "둘이 같은 말 아님?" | ✅ | 정답. 차이: secret=**RP 고정 비밀번호**(등록 때 1번 발급, 모든 로그인에 같은 값, "shop 이 보냈다" 증명) / verifier=**로그인 1번마다 새로 만드는 1회용**(2번에서 생성, "이 로그인을 시작한 쪽" 증명). secret 을 못 숨기는 앱(모바일·SPA)·secret 유출 시 PKCE 가 막아줌 | |
| 2-6 | 2026-10-19 | id_token 의 iss 끝에 `/` 가 하나 더 붙으면 | "인식을 못하고 실패" | △ | RP 는 설정에 둔 issuer 와 iss 를 **완전 일치**로 비교(정규화 안 함) → 거절. 한 사람이 아니라 **모든 사용자 로그인이 실패**. 그래서 issuer 는 env 한 곳에서만 만들고 zod 로 끝 `/` 금지 | |

### 단계 3 — 서명키 & JWKS

| # | 날짜 | 질문 | 학습자 답 | 상태 | 핵심 포인트 (정답) | 복습 이력 |
|---|---|---|---|---|---|---|
| 3-1 | 2026-10-19 | 서명하는 키 / 확인하는 키 | "개인키, 공개키" | ✅ | IdP 가 개인키로 서명, RP 가 /jwks 의 공개키로 확인 | |
| 3-2 | 2026-10-19 | /jwks 에 개인키가 새면 | "해커가 다른 사람의 공개키를 개인키에 대입시켜 로그인" | ❌ | 대입 같은 건 없다. 개인키를 가진 **누구나** 아무 `sub`(예: 철수)로 **가짜 id_token 을 직접 서명**해 만들 수 있고, RP 는 공개키로 확인해도 진짜와 구별 못 해 통과 → 우리 IdP 를 믿는 **모든 RP 에서 모든 사용자로** 로그인 가능. 대응: 즉시 새 키로 교체하고 샌 키를 /jwks 에서 제거 | |
| 3-3 | 2026-10-19 | (개념 질문) id_token 이 jwks 의 개인키인가 | "id_token 이 jwks 의 개인키를 말하는 거 아니지?" | △ | 다르다. id_token = 개인키로 **도장 찍힌 증명서**(JWT: header.payload.signature, 로그인마다 새로 발급). 개인키 = **도장**(IdP DB 에만, 밖으로 안 나감). 연결 고리는 header 의 `kid` → /jwks 에서 같은 kid 의 공개키로 서명 확인 | |
| 3-4 | 2026-10-20 | kid·alg·use 를 저장 때 vs 응답 때 붙이기 | "B(응답 때). 응답 = RP 로그인 응답이니까" | △ | 선택 B 는 OK, 이유가 틀림. 여기서 "응답"은 **`GET /jwks` 의 응답**이지 로그인 응답(9번 `/token` 응답)이 아니다. RP 는 10번 id_token 검증 때 /jwks 를 **따로** 호출(보통 캐시). B 의 진짜 이유: `kid` 는 이미 컬럼에 있으니 public_jwk 에 또 넣으면 중복 → 둘이 어긋날 수 있음 | |
| 3-5 | 2026-10-20 | /jwks 에 active=false 옛 키도 넣나 | "넣는다. 옛 공개키로 로그인된 사용자가 있을 수 있어서" | △ | 넣는 건 맞음. 정확한 이유: 교체 **직전에 옛 개인키로 서명된 id_token** 이 아직 RP 의 10번 검증 전일 수 있음 → kid 로 찾을 공개키가 없으면 검증 실패. 이미 로그인 끝난 사용자는 RP 세션 쿠키를 쓰므로 무관(0-6). 옛 키는 영원히가 아니라 그 키로 서명한 토큰 만료 시간이 지나면 제거 | 2026-10-20 재확인(A 즉시 삭제 시나리오) → ✅ "검증하던 사용자가 A 를 못 찾아 실패". 주어 교정: 검증은 사용자가 아니라 **RP** 가 함 |
| 3-6 | 2026-10-20 | 암호화 키를 같은 DB 에 두면 (DB 통째 유출 가정) | "토큰을 탈취할 수 있고 다른 사람으로 위장해서 로그인" | △ | 결과(위장 로그인)는 맞음. 빠진 연결고리: 탈취 대상은 토큰이 아니라 **암호화 키 + 암호화된 개인키** → 바로 복호화 → 개인키 획득 → 3-2 와 같음(아무 `sub` 로 id_token 위조 → **모든 RP 에서 모든 사용자**). 핵심: 자물쇠 옆에 열쇠를 두면 암호화는 의미 없음. 키는 DB 와 **다른 곳**(env/KMS)에 둬야 DB 만 샐 때 개인키가 안전 | |

### 단계 4 — authorize

| # | 날짜 | 질문 | 학습자 답 | 상태 | 핵심 포인트 (정답) | 복습 이력 |
|---|---|---|---|---|---|---|
| 4-1 | 2026-10-20 | redirect_uri 를 prefix 로만 비교하면 (`callback.evil.com`, `callback/../steal`) | "csrf 공격이 위험함" | ❌ | CSRF 아님(그건 state 가 막는 것). 7번 302 가 **code 를 공격자 주소로 배달** → 공격자가 피해자의 code 를 손에 넣음 = authorization code 유출. 이걸로 피해자 계정으로 로그인 시도(code 주입). PKCE·client_secret 이 2차로 막아도 1차 방어선은 **정확히 일치** | |
| 4-2 | 2026-10-20 | client_id 가 틀리면 왜 redirect 안 하고 IdP 화면에 에러? | "잘 모르겠음" | ❌ | client_id 를 모르면 그 redirect_uri 가 **등록된 값인지 확인할 방법이 없음** → 그대로 보내면 open redirect. 공격자가 `idp.com/authorize?client_id=가짜&redirect_uri=피싱사이트` 링크를 뿌리면 사용자는 믿을 만한 IdP 주소를 눌렀는데 피싱 사이트로 튕겨 감. 확인 안 된 주소로는 절대 보내지 않는다 | |
| 4-3 | 2026-10-20 | (개념 질문) code 가 client_id 인가 | "code 는 client_id 를 말하는 건가" | ❌ | 다르다. client_id = **RP 의 이름표**(등록 때 1번, 공개, 모든 로그인에 같은 값, 4번 URL 에 RP 가 실어 보냄). code = **IdP 가 로그인 1번마다 새로 만드는 1회용 교환권**(랜덤, 1분 만료, 7번 URL 로 IdP 가 돌려줌, 8번에서 토큰으로 바꾸면 끝). 8번에 둘이 같이 가서 "이 code 가 이 client 에게 발급된 게 맞나"를 대조 | |
| 4-4 | 2026-10-21 | client_secret 은 왜 암호화가 아니라 해시? | "secret 은 RP 의 code 랑 매칭하는 것. 그래서 해시만 있어도 충분" | △ | 결론(해시면 충분)은 맞음, 역할이 틀림. secret 은 code 와 매칭하는 값이 아니라 **RP 의 비밀번호**("내가 진짜 shop") — code↔RP 대조는 code 에 묶어 둔 `client_id` 로 함. IdP 는 받은 secret 을 해시해서 저장된 해시와 **같은지만** 보면 됨 → 원문 불필요 → 되돌릴 수 없는 해시. 개인키는 서명할 때 **원문이 필요** → 되돌릴 수 있는 암호화 | 2026-10-21 이어서 "secret 은 RP·IdP 둘 다 env 에 두는 것 아님?" → 흐름이 안 그려짐. 등록(0번) 때 IdP 가 생성 → RP 는 **원문을 env** 에, IdP 는 **해시를 DB `oidc_client`** 에(RP 가 여러 개라 env 불가) → 8번에 RP 가 원문 전송, IdP 가 해시해서 비교. 시퀀스로 설명 → 이어서 "oidc_client 가 털려도 해시라 괜찮다, 원문은 RP 만 안다" ✅ 스스로 정리 |
| 4-5 | 2026-10-21 | (개념 질문) secret 은 노출돼도 상관없나 | "어떤 RP 인지 비교만 하니까 노출돼도 상관없고, 개인정보 위험이 없어서 해시로 한다" | ❌ | 반대. 노출되면 **위험**하다 — secret 을 가진 사람은 8번에서 **shop 행세**를 할 수 있음(훔친 code + secret → 토큰 시도, PKCE 가 마지막 방어선). 해시로 저장하는 이유가 바로 "위험하니까": DB 가 털려도 원문이 없게. 노출되면 새 secret 발급·교체. 노출돼도 되는 건 `client_id` 쪽 | 2026-10-21 바로 재확인 "client_id 는 털려도 되고 secret 만 안 털리면 되나" → ✅ (아이디/비밀번호 구조) |
| 4-6 | 2026-10-23 | redirect_uris 는 왜 배열? | "모르겠다" | ❌ | RP 하나가 callback 주소를 여러 개 가짐: 환경별(localhost·staging·운영), 도메인별(www·app), 앱(모바일 custom scheme). 배열이어도 비교는 **그중 하나와 정확히 일치**(4-1). "목록에 비슷한 게 있으면 통과"가 아님 | |
| 4-7 | 2026-10-23 | seed 재실행 때 새 secret 을 출력하면 | "해시와 안 맞음, 복사하면 검증할 때 에러" | ✅ | 맞음. 정확히: **8번 `/token`** 에서 IdP 가 hash(받은 secret) ≠ 저장된 해시 → `invalid_client`(401). 4~7번(로그인·code 발급)은 다 성공하고 마지막에만 실패해서 원인 찾기 어려움 → 그래서 이미 있으면 secret 을 **출력하지 않는다** | |
| 4-8 | 2026-10-23 | (학습자 제안) redirect_uri 를 `//` 제거 등 정규화한 뒤 비교 | "프론트가 준 값을 정규화해서 검사해야 할 것 같다" | ❌ | 4-1 과 충돌. 정규화는 통과 범위를 **넓히기만** 함(등록 안 한 문자열도 통과). IdP 정규화기와 브라우저의 URL 해석이 다르면 그 틈으로 code 가 딴 데로 감. 스펙(OIDC Core 3.1.2.1, RFC 9700)은 **단순 문자열 비교**. RP 가 다른 형태로 보내면 RP 버그 → 등록값을 고치지 IdP 가 맞춰주지 않음 | |
| 4-9 | 2026-10-23 | (학습자 제안) 1단계 에러 메시지가 자세하면 해커에게 유리? | "client 없음 / redirect_uri 불일치를 나눠 보여주면 위험할 것 같다" | △ | 통일해도 OK 지만 이득은 작음: `client_id` 는 원래 공개값(4-5)이라 "있다/없다"를 알려줘도 잃는 게 거의 없음. 1단계의 진짜 보안 포인트는 메시지가 아니라 **redirect 하지 않는 것**(4-2). 자세한 원인은 서버 로그에 남기고 화면은 한 문장으로 — 이게 흔한 절충 | |
| 4-10 | 2026-10-26 | (개념 질문) nonce 가 뭐야 | "nonce 가 뭐야?" | ❌ | 로그인 1번마다 RP 가 만드는 랜덤값. 2번 생성·쿠키 저장 → 4번 /authorize 로 전송 → IdP 가 code 에 묶어 저장(④) → 9번 id_token 안에 그대로 넣음 → 10번 RP 가 쿠키값과 비교. 막는 것: **다른 로그인의 id_token 을 끼워 넣기(재사용)**. state = 7번 callback(URL) 보호, nonce = 10번 id_token 보호 | 2026-10-26 이어서 "nonce 는 서버 간 통신?" → 아님. 갈 때 4번 **브라우저 URL**(front), 올 때 9번 **id_token 안**(back). 비밀값 아님 — 알아도 id_token 을 위조 못 함(서명은 IdP 개인키) |
| 4-11 | 2026-10-26 | env 의 dev-user 가 DB 에서 지워졌는데 getCurrentUser 가 env 만 보고 돌려주면 | "없는 사용자라 에러" | △ | 에러는 **FK 가 있을 때만**: ④ code insert 가 FK 위반 → 500. FK 가 없으면 더 나쁨 — **조용히 성공**해서 없는 사용자로 code 발급 → 단계 5 id_token `sub=dev-user` 서명 → RP 는 유령 사용자로 로그인. 대응 ① getCurrentUser 가 DB 조회, 없으면 null(=미로그인) ② ④ 테이블 user_id 에 FK | |

## 10. 참고 스펙

- OpenID Connect Core 1.0 — https://openid.net/specs/openid-connect-core-1_0.html
- OpenID Connect Discovery 1.0 — https://openid.net/specs/openid-connect-discovery-1_0.html
- OIDC RP-Initiated Logout 1.0 — https://openid.net/specs/openid-connect-rpinitiated-1_0.html
- RFC 6749 OAuth 2.0 — https://datatracker.ietf.org/doc/html/rfc6749
- RFC 7636 PKCE — https://datatracker.ietf.org/doc/html/rfc7636
- RFC 7517 JWK — https://datatracker.ietf.org/doc/html/rfc7517
- RFC 9700 OAuth 2.0 Security BCP — https://datatracker.ietf.org/doc/html/rfc9700
