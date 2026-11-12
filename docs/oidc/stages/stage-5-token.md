# 단계 5: `POST /token` — code 를 토큰으로 바꾸기

> 시작: 2026-11-03 · 상태: 🟡 진행 중
> 전체 로드맵·학습 로그·오답 노트는 [SPEC.md](../SPEC.md). 이 문서는 단계 5 구현 과제와 리뷰 기록만 담는다.

## 무엇을 만드나

정리 문서 **8번~9번**의 IdP 쪽. 값 흐름은 [flow-data.html](../flow-data.html) 참고.

```
8번  RP 서버 → IdP  POST /api/oidc/token
                    Authorization: Basic base64(client_id:client_secret)
                    Content-Type: application/x-www-form-urlencoded
                    grant_type=authorization_code&code=...&redirect_uri=...&code_verifier=...
     IdP: RP 확인 → code 행 찾기·대조 → PKCE → code 소진 → id_token 서명
9번  IdP → RP 서버  200 { access_token, token_type: "Bearer", expires_in, id_token }
                    Cache-Control: no-store
```

- 서버끼리(back-channel) 통신이다. 브라우저·state 는 등장하지 않는다 (2-4)
- 에러는 **302 가 아니라 JSON** `{ "error": "..." }` 로 돌려준다 (authorize 와 다름. RFC 6749 §5.2)

## 시작 전 확인 (2026-11-03)

| 질문 | 학습자 답 | 결과 | 보충 |
|---|---|---|---|
| RP 가 /token 에 보내는 값과 IdP 가 비교하는 대상 | "client_secret, verifier 로 비교" | △ | 보내는 값은 5개: `client_id`·`client_secret`(Basic 헤더), `code`, `redirect_uri`, `code_verifier`. 비교 대상까지 말해야 함 — 아래 표 |
| 훔친 code 로 /token 을 부르면 / 쓴 code 가 다시 오면 | "verifier 가 안 된다 / 에러" | △ | 우리는 confidential client 라 **client 인증(secret)에서 먼저** 막힘. PKCE 는 secret 까지 샌 경우의 다음 방어선. 재사용은 에러(`invalid_grant`)만이 아니라 **그 code 로 이미 발급한 토큰을 폐기** 고려(재사용 = 누가 훔쳤다는 신호) |

| 받은 값 | 무엇과 비교 |
|---|---|
| `client_id` + `client_secret` | `oidc_client` 의 `client_secret_hash` (해시해서 상수시간 비교) |
| `code` | 해시해서 `oidc_authorization_code.code_hash` 로 행 찾기 |
| (위 행의) `client_id` | Basic 헤더로 인증된 client_id 와 같은지 |
| `redirect_uri` | 그 행의 `redirect_uri` 와 정확히 일치 |
| `code_verifier` | `BASE64URL(SHA256(verifier))` 가 그 행의 `code_challenge` 와 같은지 |

## 만들 것

### ① 입력 받기
- [x] `POST /token`, body 는 **form-urlencoded** (JSON 아님)
- [x] `grant_type` 없으면 `invalid_request`, 있는데 `authorization_code` 가 아니면 `unsupported_grant_type`
- [x] `code`·`redirect_uri`·`code_verifier` 없으면 `invalid_request`
- [x] 이 엔드포인트는 로그인 가드 대상이 아님 (사용자 쿠키 없이 RP 서버가 부름)
- [x] 성공은 **200** (Nest POST 기본 201 → 변경. RFC 6749 §5.1)

### ② client 인증 (실패 → 401 `invalid_client`)
- [x] `Authorization: Basic` 헤더에서 client_id / secret 꺼내기 (첫 `:` 에서 나누고 URL 디코드, 실패 시 401 + `WWW-Authenticate: Basic`)
- [x] `oidc_client` 에서 찾고, 받은 secret 을 저장된 해시와 비교 — **bcrypt** (2026-11-04 학습자 결정, 아몬드영과 같게. `bcrypt.compare` 가 상수시간 비교 포함). 라이브러리는 네이티브 빌드가 필요 없는 `bcryptjs`
- [x] 왜 `===` 말고 상수시간 비교인지 설명 가능 (5-6)
- [x] 응답은 `invalid_client` 하나, 로그에만 이유(`no_authorization_header`·`not_basic_auth`·`no_colon`·`bad_url_encoding`·`empty_id_or_secret`·`unknown_client`·`secret_mismatch`)
- [x] client 인증을 body 검사보다 **먼저**

### ③ code 확인 (실패 → 400 `invalid_grant`)
- [x] code 해시로 행 찾기 — 없으면 거절
- [x] `expires_at` 지남 → 거절
- [x] `used_at` 있음 → 거절 (+ 재사용 대응, ⑥ 참고)
- [x] 행의 `client_id` ≠ 인증된 client → 거절
- [x] `redirect_uri` 정확히 일치 아님 → 거절
- [x] PKCE: verifier 를 S256 한 값 ≠ `code_challenge` → 거절
- [x] 실패 이유는 로그에만 자세히, 응답은 `invalid_grant` 하나 (4-9 와 같은 절충)

### ④ code 소진
- [x] 검사 통과하면 **바로** `used_at` 기록
- [x] 동시에 같은 code 로 두 요청이 오면? 둘 다 통과하지 않게 (조건부 update 등) — 방법은 학습자가 정한다 → `UPDATE … WHERE used_at IS NULL RETURNING` (2026-11-08 학습자)

### ⑤ 토큰 발급
- [x] 서명 키: `jwks` 에서 active 키 읽기 → Reader 로 옮기기 (2026-10-31 메모)
- [x] id_token (RS256, 헤더에 `kid`)
  - `iss` = `OIDC_ISSUER` 그대로, `sub` = user_id, `aud` = client_id
  - `iat`, `exp`, `auth_time`(code 행), `nonce`(code 행에 있을 때만)
  - scope 에 따라 `email`·`email_verified`·`name`·`picture` — `scopes_supported` 밖 scope 는 무시 (단계 4 메모)
- [x] access_token: **JWT (RS256, `jwks` active 키로 서명), 만료 15분** — 2026-11-03 학습자 결정
  - 이유: RP 는 API 가 여러 개가 될 예정 → 그 API 들이 IdP 에 묻지 않고 공개키로 직접 검증해야 함.
    Keycloak·Auth0(등록 API)·Okta(커스텀 서버)·아몬드영과 같은 방식. 실무 권장 구조는 BFF(브라우저는 세션 쿠키, BFF → API 는 Bearer access_token)
  - 대가: 만료 전 폐기 불가 → 15분으로 짧게. 진짜 폐기는 단계 9 refresh_token(랜덤 문자열, DB) 에서
  - 모양은 RFC 9068 참고(`typ: at+jwt`, `iss`·`sub`·`aud`·`exp`·`iat`·`jti`·`client_id`·`scope`). `aud` = client_id (2026-11-09 결정, 아몬드영과 같게)
  - 단계 7 `/userinfo` 는 이 JWT 를 서명·만료·`iss`·`aud` 로 검증
- [x] 응답 헤더 `Cache-Control: no-store`, `Pragma: no-cache`

### ⑥ 재사용 감지 — 2026-11-03 결정
- [x] 이미 쓴 code 가 다시 오면 `invalid_grant` 로 거절하고 **경고 로그** (탈취 신호)
- 이미 나간 access_token 은 JWT 라 폐기하지 않고 **15분 만료로 끝남**을 받아들인다 (위 ⑤ 결정의 대가)
- [x] 랜덤 문자열 토큰이었다면 무엇을 저장해야 폐기할 수 있었는지(토큰 ↔ code 연결) 설명 가능

## 완료 확인 방법

단계 5 부터는 **e2e 테스트(supertest)** 로 (2026-10-26 결정): verifier 생성 → authorize → code → token 자동화.
1. 정상 → 200, `id_token`·`access_token`, `Cache-Control: no-store`
2. secret 틀림 → 401 `invalid_client`
3. 같은 code 두 번 → 두 번째 400 `invalid_grant`
4. 틀린 `code_verifier` → 400 `invalid_grant`
5. 다른 `redirect_uri` → 400 `invalid_grant`
6. 만료된 code → 400 `invalid_grant`
7. id_token 을 jwt.io 로 열어 claim 확인, 헤더 `kid` 가 `/jwks` 에 있는지 확인

## 생각해볼 질문 (완료 때 채점)

1. 9번 응답에 `Cache-Control: no-store` 가 없으면 무슨 일이?
2. ④ 에서 `used_at` 기록을 id_token 서명 **뒤**로 미루면 어떤 틈이 생기나?
3. RP 가 id_token 의 `aud` 를 확인하지 않으면 다른 RP 가 무엇을 할 수 있나?

## 힌트 (필요할 때만)

- form body: Nest 는 기본으로 urlencoded 파싱함. 전역 ValidationPipe 는 `whitelist: true, forbidNonWhitelisted: false` → DTO 에 없는 필드는 에러 없이 조용히 버려짐
- 전역 `AllExceptionsFilter` 가 throw 된 에러를 전부 `{ error: { statusCode, message, ... } }` 로 감쌈 → /token 에서 throw 하면 RFC 6749 §5.2 모양(`{ "error": "invalid_request" }`)이 안 나옴. DTO 검증 실패도 같은 길로 감
- 상수시간 비교: node `crypto.timingSafeEqual` (길이가 다르면 throw → 해시끼리 비교하면 길이 같음)
- JWT 서명: 이미 쓰는 라이브러리가 있는지 먼저 확인, 없으면 `jose`

## 리뷰 기록

- 2026-11-03 ① 완료. 리뷰에서 고친 것:
  - DTO 에 데코레이터가 없어 `whitelist: true` 가 모든 필드를 버림 → `@IsString() @IsOptional()`
  - throw 하면 전역 `AllExceptionsFilter` 모양이 됨 → `res.status(400).json({ error })` 로 직접 응답 (RFC 6749 §5.2), 대신 `appLogger.warn` 직접 기록
  - `client_id`·`client_secret` 을 body 에서 뺌 (`client_secret_basic` 이라 헤더로 옴, ② 에서)
  - `error` 값은 정해진 코드만 (`"code is required"` → `invalid_request`, 설명은 `error_description`)
  - `grant_type &&` 조건 때문에 **grant_type 없이 통과**하던 것 → 없음/지원 안 함을 나눔
  - 201 → 200
  - 남은 것: 배열 등 잘못된 타입은 아직 필터 모양(정상 RP 는 안 보내서 보류)
- 2026-11-04 ② 완료. 리뷰에서 고친 것:
  - 헤더 없음을 400 `invalid_request` → 401 `invalid_client` (RFC 6749 §5.2)
  - `WWW-Authenticate: Bearer` → `Basic` (/token 은 client 를 Basic 으로 받음. Bearer 는 단계 7 /userinfo)
  - `indexOf(':') === -1` 미처리, `decodeURIComponent` 의 URIError 로 500, catch 의 `return` 누락(응답 2번), try 안 `const` 스코프
  - 서비스에서 `RPClient.clientSecret` 비교 → DB 엔 해시만 있음(4-4 재발)
  - 멘토 수정(학습자 요청): sha256 → bcryptjs 교체(seed·service), 컨트롤러에서 `authenticateClient` 호출, 로컬 DB shop 행 해시를 bcrypt 로 UPDATE(새 secret 발급, code 행 FK 때문에 삭제 대신)
  - 결정: 판단 로직은 Service, DB 쓰기는 Manager (아몬드영은 Manager 가 판단까지 함 — 레포 안에서 통일이 중요)
