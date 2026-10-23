# 단계 4: `GET /authorize` — code 발급

> 시작: 2026-10-20 · 상태: ⏳ 진행 중
> 전체 로드맵·학습 로그·오답 노트는 [SPEC.md](../SPEC.md). 이 문서는 단계 4 구현 과제와 리뷰 기록만 담는다.

## 무엇을 만드나

정리 문서([위키 "oidc 헷갈렸던 부분들 정리"](https://github.com/nookbox/idp/wiki/%EA%B8%B0%EB%A1%9D-oidc-%EC%A0%95%EB%A6%AC)) **4번~7번**의 IdP 쪽.

```
4번  브라우저 → IdP  GET /api/oidc/authorize?response_type=code&client_id=shop
                      &redirect_uri=http://localhost:4000/callback&scope=openid profile email
                      &state=...&nonce=...&code_challenge=...&code_challenge_method=S256
     IdP: RP 확인 → 파라미터 확인 → 로그인 확인 → code 발급·저장
7번  IdP → 브라우저  302 http://localhost:4000/callback?code=...&state=...
```

- 이번 단계는 **code 까지**. 토큰은 주지 않는다 (토큰은 단계 5 `/token`, 8~9번)
- code = 로그인 1번짜리 1회용 교환권. client_id(RP 이름표)와 다르다 (4-3 복습)

## 준비

- 로그인/세션은 Phase 2 (2026-10-20 결정). 그래서 ③ 에서 "로그인한 사용자"를 **개발용으로 대신**한다
- 로컬 DB `user` 테이블이 비어 있다 → ③ 에서 개발용 사용자 1명을 넣는다
- 스키마는 `src/database/schema/oidc.ts` 에 이어서. 마이그레이션은 `pnpm db:generate` → SQL 확인 → `pnpm db:migrate`

## 만들 것

### ① 테이블 `oidc_clients` (등록된 RP 목록)
- [x] `client_id` (PK, 공개 이름표. 예: `shop`)
- [x] `client_secret_hash` (secret 원문이 아니라 **해시**. 쓰는 건 단계 5)
- [x] `redirect_uris` (text 배열. 등록된 callback 주소들)
- [x] `name`, `created_at`
- [x] 테스트용 RP 1개 넣기 (`client_id=shop`, `redirect_uris=['http://localhost:4000/callback']`)

### ② 파라미터 검증 — 순서가 중요하다
**1단계: RP 확인 (실패 → IdP 화면에 에러, redirect 금지)**
- [x] `client_id` 가 `oidc_client` 에 있다
- [x] `redirect_uri` 가 그 client 의 `redirect_uris` 중 하나와 **정확히 일치** (prefix·부분 일치 금지, 4-1)
- 여기서 실패하면 그 `redirect_uri` 는 확인 안 된 주소라서 보내면 open redirect (4-2)

**2단계: 나머지 확인 (실패 → `redirect_uri?error=...&state=...` 로 302)**
- [x] `response_type` 이 정확히 `code` → 아니면 `error=unsupported_response_type`
- [x] `scope` 에 `openid` 포함 → 아니면 `error=invalid_scope`
- [x] `code_challenge` 있음, `code_challenge_method` 가 `S256` → 아니면 `error=invalid_request`
- [x] 에러로 돌려보낼 때도 받은 `state` 를 **그대로** 붙인다

### 다음 작업 (② 끝난 뒤, 2026-10-23)
1. **③ 시작 전 멘토와 정할 것**: 개발용 로그인 사용자를 어떻게 대신할지(env 에 user id / 코드 고정)
2. **4번 요청을 로그인 끝까지 들고 가는 방법**: 정상 흐름은 4번 → ③ 로그인(요청 여러 번) → 7번이라
   `state`·`client_id`·`redirect_uri`·`code_challenge`·`nonce` 를 로그인 동안 어딘가(쿠키·세션·로그인 URL 쿼리)에 들고 있어야 함.
   개발용 로그인이면 요청 1번에 끝나니 지금은 query 를 그대로 쓰면 되지만, Phase 2 진짜 로그인 때 다시 결정
3. **`nonce` 받기**: DTO 에 `nonce` 필드 추가 (`forbidNonWhitelisted` 라 없으면 400). ④ 에서 code 와 같이 저장
4. **④ 에서 처음으로 Manager 등장**: code 저장(C) → `managers/` 폴더. state 는 7번 URL 로만 돌려주고 DB 에 안 넣음
5. 정상 통과 시 지금의 `res.send('ok')` 를 `302 redirect_uri?code=...&state=...` 로 교체

### ③ 로그인 확인 (개발용 대신하기)
- [ ] 개발용 사용자 1명을 `user` 테이블에 넣는다
- [ ] "지금 로그인한 사람"을 돌려주는 함수 하나를 만들고, 지금은 그 개발용 사용자를 돌려준다
- Phase 2 에서 진짜 세션이 생기면 **이 함수 안만** 바꾸면 되게 한 곳에 모은다
- 어떻게 대신할지(env 에 user id, 코드에 고정 등)는 시작할 때 멘토와 정한다

### ④ 테이블 `oidc_authorization_code` + 발급
- [ ] code 는 충분히 긴 랜덤 (32바이트 이상, base64url)
- [ ] DB 에는 code **원문 말고 해시**를 저장 (`code_hash`). DB 가 새도 code 를 못 쓰게
- [ ] 같이 묶어 저장: `client_id`, `user_id`, `redirect_uri`, `scope`, `nonce`, `code_challenge`, `auth_time`
- [ ] `expires_at` = 지금 + 1분, `used_at` (단계 5 에서 1회용 처리에 씀)
- [ ] 302 → `redirect_uri?code=원문&state=받은값`

## 힌트 (필요할 때만)

- 랜덤: node `crypto.randomBytes(32).toString('base64url')`
- 해시: `crypto.createHash('sha256').update(code).digest('base64url')`
- Nest 에서 302: `@Redirect()` 또는 `res.redirect()`
- URL 조립은 문자열 이어붙이기 말고 `new URL(redirectUri)` + `url.searchParams.set(...)` (이미 `?` 가 있는 주소도 안전)

## 완료 확인 방법

브라우저 주소창이나 `curl -i` 로:
1. 정상 요청 → `302`, `Location: http://localhost:4000/callback?code=...&state=같은값`
2. 없는 `client_id` → `302` **아님**, IdP 에러 응답
3. `redirect_uri=http://localhost:4000/callback.evil.com` → `302` **아님**
4. `scope=profile` (openid 없음) → `302 ...callback?error=invalid_scope&state=...`
5. `code_challenge_method=plain` → `302 ...callback?error=invalid_request&state=...`
6. DB `oidc_authorization_code` 에 code **원문이 없다** (해시만)

## 만들면서 생각해볼 질문

- code 에 `nonce` 와 `code_challenge` 를 **왜** 같이 저장해 둘까? 각각 단계 5 의 몇 번에서 꺼내 쓰일까?
- code 만료를 10분이 아니라 1분으로 짧게 잡는 이유는? 1분이면 정상 사용자에게 문제는 없을까?

> 내 답:
>
> -
> -

## 리뷰 기록

> 학습자가 "단계 4 다 했어"라고 하면 멘토가 여기에 날짜별로 지적·잘한 점·수정 여부를 기록한다.
- 2026-10-23 ① oidc_clients: `redirect_uris` 처음엔 `$type<string[]>()` 만 붙인 text → `.array()` 로 교정. timestamps 공통화(`schema/timestamps.ts`, withTimezone) 하며 user·jwks 도 timestamptz 로(0009).
  seed `scripts/seed-oidc-client.ts`: 이미 있으면 secret 출력 안 함(4-7). 두 번 실행 확인, DB 해시 = sha256(출력된 secret) 확인. 에디터 node 타입 에러 → `scripts/tsconfig.json` 추가.
- 2026-10-23 ② 파라미터 검증 완료. 구조: `readers/oidc-client.reader.ts`(조회만) + `dto/authorize-query.dto.ts`(타입만 검사, 값 검사는 Service — DTO 에서 막으면 302 대신 400) + Service 가 에러 이름 반환 → Controller 가 1단계 throw 400 / 2단계 302.
  지적·교정: client 를 `name` 으로 조회 → `client_id` / Reader 에 `@Injectable`·`@Inject(DATABASE)`·providers 등록 누락 / `return new NotFoundException` → throw / DB row(`client_secret_hash` 포함) 를 응답으로 반환 → `'ok'` / response_type 을 DB 컬럼으로 검사 → 요청값 `=== 'code'` / `responseType &&` 가드 때문에 값 없으면 통과 / 문자열 `.includes('code')` 부분 일치 / 2단계도 throw 하려 함 → 302.
  학습자 제안: redirect_uri 정규화(4-8 ❌), 에러 메시지 통일(4-9 △).
  curl 확인: 없는 client 400, evil redirect 400, response_type·scope·plain 각각 302+error+state, state 없으면 error 만, 정상 200 `ok`.
