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

### ① 테이블 `oidc_client` (등록된 RP 목록)
- [ ] `client_id` (PK, 공개 이름표. 예: `shop`)
- [ ] `client_secret_hash` (secret 원문이 아니라 **해시**. 쓰는 건 단계 5)
- [ ] `redirect_uris` (text 배열. 등록된 callback 주소들)
- [ ] `name`, `created_at`
- [ ] 테스트용 RP 1개 넣기 (`client_id=shop`, `redirect_uris=['http://localhost:4000/callback']`)

### ② 파라미터 검증 — 순서가 중요하다
**1단계: RP 확인 (실패 → IdP 화면에 에러, redirect 금지)**
- [ ] `client_id` 가 `oidc_client` 에 있다
- [ ] `redirect_uri` 가 그 client 의 `redirect_uris` 중 하나와 **정확히 일치** (prefix·부분 일치 금지, 4-1)
- 여기서 실패하면 그 `redirect_uri` 는 확인 안 된 주소라서 보내면 open redirect (4-2)

**2단계: 나머지 확인 (실패 → `redirect_uri?error=...&state=...` 로 302)**
- [ ] `response_type` 이 정확히 `code` → 아니면 `error=unsupported_response_type`
- [ ] `scope` 에 `openid` 포함 → 아니면 `error=invalid_scope`
- [ ] `code_challenge` 있음, `code_challenge_method` 가 `S256` → 아니면 `error=invalid_request`
- [ ] 에러로 돌려보낼 때도 받은 `state` 를 **그대로** 붙인다

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
