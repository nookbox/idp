# 단계 8: 동의(consent) — "이 앱에 내 정보를 줘도 될까요?"

> 시작: 2026-11-22 · 상태: 🟡 서버·화면 완료 (e2e 10개 + 손 확인 3개), 철회 남음
> 전체 로드맵·학습 로그·오답 노트는 [SPEC.md](../SPEC.md). 이 문서는 단계 8 구현 과제와 리뷰 기록만 담는다.
> 단계 7 에 이어 **e2e 먼저** (TDD).

## 무엇을 만드나

```
RP → /authorize?scope=openid email profile
IdP: client·redirect_uri·PKCE 검사 → 로그인 확인
     → 이 user + client 의 저장된 동의가 요청 scope 를 다 덮나?
         예  → 바로 code 발급 (지금과 같음)
         아니오 → 동의 화면: "shop 이 이메일·이름을 보려고 합니다"
                  [허용] → 동의 저장 → code 발급 (scope = 허락받은 것)
                  [거부] → redirect_uri?error=access_denied&state=...
```

- 지금은 로그인만 돼 있으면 **묻지 않고** code 를 준다. 단계 7 의 "scope = 사용자가 허락한 범위"가 실제로는 허락받는 과정 없이 돌고 있다
- 거부는 RFC 6749 §4.1.2.1 `access_denied` (302 로 RP 에 돌려보냄, 단계 4 의 `redirectRP` 그대로)
- 자사(1st party) client 는 동의 생략 가능 → **client 마다** 정한다

## 시작 전 확인 (2026-11-22) — 결과 Q1 ✅ Q2 ✅ Q3 △ (SPEC §9 8-1~8-3)

1. 자사 앱만 붙는 IdP 라면 동의 화면이 필요할까?
2. "email 허용, profile 거부" 면 토큰 scope 는?
3. 동의는 무엇과 무엇의 조합으로 저장하나?

## 결정 (2026-11-22)

- **동의 화면 위치: web** (`apps/auth/web` 의 `/consent`). 로그인 화면을 web 에 두기로 한 방향(SPEC §2)과 같게
- **요청 전달: 서명된 URL** (better-auth 방식). /authorize 가 검사 통과한 요청 + `exp` 를 HMAC 서명(`sig`)해 동의 화면 URL 에 싣고, [허용]/[거부] 때 그 쿼리를 그대로 돌려받아 서명·만료 확인 → 그 값으로 code 발급
  - 비교한 다른 방식: URL 에 그대로(A, 조작 가능 ❌) / 번호표(B, DB 에 저장하고 id 만 넘김 — node-oidc-provider 의 `Interaction`. 한 번만 쓰기 가능)
  - 서명 방식을 고른 이유(학습자): DB 없이 간단. 10분 안 재사용은 가능하지만 새 code 는 등록된 redirect_uri 로만 가고 /token 에서 secret·verifier 가 필요해서 피해가 원래 RP 로 한정
  - **꼭 챙길 것**: ① 서명에 **사용자 id** 포함 → [허용] 받을 때 "지금 로그인한 사람 = 서명된 사용자" 확인 (남의 서명 URL 로 동의시키기 방지) ② [허용] POST 의 **CSRF** 방어 (서명은 내용만 지킴, 누가 보냈는지는 못 지킴) ③ HMAC 비밀키 env 추가 (JWKS 키와 별개)
- **동의 생략: client 컬럼 `skipConsent` (기본 false = 물어봄)**. 기본값은 "실수했을 때 덜 위험한 쪽"(단계 3 `active` 기본 false 와 같은 이유). 이름 참고: better-auth·Ory Hydra `skip_consent`, Keycloak `consentRequired`
- **기존 e2e 살리기: 1번 방식** — 테스트 client(shop)는 `skipConsent=true` 로 두어 token·userinfo 18개 그대로, consent 테스트는 생략 안 하는 client 를 따로 등록 (2번 "동의를 미리 DB 에"는 동의 저장소가 먼저 있어야 해서 순서가 꼬임)
  - 참고: better-auth `authorize.ts`(`signParams`)·`utils/index.ts`(`verifyOAuthQueryParams`), [sign-in flow 문서](https://better-auth.com/docs/plugins/oauth-provider/sign-in-flow)

## 만들 것

### ① e2e 먼저 (빨간불)
- [x] 처음 보는 user+client → code 대신 **동의 화면으로** (code 없음)
- [x] 허용 → code 발급, 그 code 로 받은 토큰의 scope = 허락한 scope
- [x] 거부 → 302 `error=access_denied` (+ state 그대로), code 없음
- [x] 이미 동의한 scope 범위 안 → 동의 화면 없이 바로 code
- [x] 더 넓은 scope 요청 (예: email 동의 후 email profile) → 다시 동의 화면
- [x] 일부만 허용 (email O, profile X) → /userinfo 에 name 없음 (단계 7 의 18 과 같은 확인)
- [x] 동의 생략 client → 동의 화면 없이 바로 code
- [x] (추가) oauth_query 조작 → 400 / 요청보다 넓게 허용 → 400 / 다른 Origin POST → 403 (CSRF)

### ② 구현 (초록불) — 설계는 학습자가 정한다
- [x] 동의 저장소: 키 = **user + client**, 값 = 허락한 scope (테이블·컬럼은 학습자가)
- [x] client 에 "동의 생략" 표시
- [x] /authorize: 로그인 확인 뒤 "저장된 동의가 요청 scope 를 덮나" 판단 (Manager)
- [x] 동의 화면으로 넘길 때 요청 정보 → **서명된 URL** (위 결정. 정렬 후 HMAC, `exp`, 사용자 id 포함)
- [x] 허용/거부 받는 엔드포인트 (이 요청이 정말 그 사용자가 보낸 건지 — CSRF)
- [x] 동의 화면 UI (web `/consent`) (2026-11-23)

### 구현 메모 (2026-11-22, 멘토 작성 → 학습자 검수)
- 테이블 `oidc_consents` (PK `user_id`+`client_id`, 둘 다 FK `on delete cascade`, `scope` 공백 문자열) — migration 0012
- env: `OIDC_CONSENT_SECRET`(HMAC, base64 32바이트+, JWKS 키와 별개), `WEB_URL`(동의 URL·Origin 검사)
- 동의 URL: `WEB_URL/consent?client_id&redirect_uri&response_type&scope&state&code_challenge&code_challenge_method&nonce&exp&sig` (exp = 10분, `CONSENT_URL_TTL_SECONDS`)
- 서명: 위 파라미터 + `sub`(사용자 id) 를 키 순서로 정렬 → HMAC-SHA256 → base64url. `sub` 는 URL 에 없음 → 다른 사용자가 보내면 서명 불일치
- `POST /api/oidc/consent` body `{ oauth_query, accept, scope? }` → Origin ≠ WEB_URL 이면 403, 로그인 없으면 401, 서명·만료·scope 오류면 400 `invalid_request`, 성공 200 `{ url }` (web 이 그 url 로 이동)
- 동의 저장은 예전 + 이번 합침. 토큰 scope 는 이번에 허락한 것만
- **web 화면이 할 일**: 쿼리 읽기 → client 이름·scope 체크박스 표시(openid 는 고정) → `fetch(POST, credentials: 'include', JSON)` → `location.href = res.url`

### 화면 메모 (2026-11-23)
- `apps/auth/web/src/app/(main)/consent/page.tsx` 한 파일 (`'use client'`, `use(searchParams)`). FSD 레이어는 안 나눔 — 이 화면에서만 쓰니까. `shared/ui` 의 `Checkbox`·`SubmitButton` 재사용
- 팝업(작은 창)이든 전체 탭이든 **페이지 하나** — 창을 여는 건 RP, 안의 화면은 IdP. 반응형으로 해결
- 스타일: 큰 틀은 넷플릭스(검정 배경·반투명 카드·큰 굵은 제목·꽉 찬 세로 버튼), 버튼은 NOOKBOX 보라(`SubmitButton`)
  - 폰(640px 미만)은 카드 없이 화면 전체 + 위에서부터, `sm:` 이상은 가운데 카드. 한글 줄바꿈 `break-keep`
- openid 체크박스는 항상 체크·잠금 (식별은 `sub` 가 하고, email 은 식별용 아님 → 선택)
- 버튼: `useTransition` 으로 pending, 누른 버튼에만 스피너(`action` 상태), 처리 중엔 둘 다 잠금. `SubmitButton` 에 `spinnerOnly` 추가
- 에러: 누를 때 지우지 않음(지웠다 생기면 버튼이 튐 = 레이아웃 시프트). "YOU ARE HERE" 감성 박스(별·점선·빨간 핀) + 등장 애니메이션은 `key={error}` 로 **문구가 바뀔 때만** 재생, `motion-safe:`, `role="alert"`

### 손 확인 (2026-11-23, 개발용 client `dev-consent` skipConsent=false)
- [x] 처음 /authorize → 동의 화면 → [허용] → `callback?code=...&state=...`
- [x] 다시 /authorize → 동의 화면 없이 바로 code
- [x] [거부] → `callback?error=access_denied&state=...`
- 참고: 동의 화면 URL 을 직접 다시 열면 10분 안엔 또 허용 가능 (서명 URL 의 재사용 허용, 결정 때 받아들인 부분). "건너뛰기"는 /authorize 에서 판단
- 발견: 로컬 `apps/auth/.env` 의 `PORT`·`BETTER_AUTH_URL`, web `.env` 의 `NEXT_PUBLIC_AUTH_URL` 이 3001 로 어긋남 (`OIDC_ISSUER`·`.env.example` 은 3011) → 3011 로 맞추기

### ③ 철회
- [ ] 계정 화면에서 동의 철회 (기존 `services-section` 연결)
- [ ] 철회 후 /authorize → 다시 동의 화면

## 완료 확인 방법

1. 위 e2e 전부 초록불
2. 확인 질문 3개 답변 (완료)
