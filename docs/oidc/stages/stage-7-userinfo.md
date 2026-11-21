# 단계 7: `GET /userinfo` — access_token 으로 사용자 정보 주기

> 시작: 2026-11-14 · 상태: 🟡 진행 중
> 전체 로드맵·학습 로그·오답 노트는 [SPEC.md](../SPEC.md). 이 문서는 단계 7 구현 과제와 리뷰 기록만 담는다.
> **이번 단계부터 e2e 를 먼저 쓰고 구현한다** (2026-11-10 학습자 결정).

## 무엇을 만드나

```
RP 서버 → IdP  GET /api/oidc/userinfo
               Authorization: Bearer <access_token>
IdP: access_token 검증(서명·만료·iss·aud·typ) → sub 로 사용자 조회 → scope 에 맞는 claim
IdP → RP 서버  200 { sub, email?, email_verified?, name?, picture? }
```

- discovery 의 `userinfo_endpoint` 는 이미 `${OIDC_ISSUER}/userinfo` 로 광고 중 (단계 2)
- 입력은 **access_token** (id_token 아님). 단계 5 에서 RFC 9068 모양 JWT 로 만들었다
- 실패는 **401** + `WWW-Authenticate: Bearer error="invalid_token"` (RFC 6750 §3). /token 의 `Basic` 과 짝

## 시작 전 확인 (2026-11-14) — 결과 Q1 ❌ Q2 ❌ Q3 ✅ (SPEC §9 7-1~7-3)

1. id_token 에도 email·name 이 들어 있는데, RP 는 왜 /userinfo 를 따로 부를까?
2. /userinfo 에 **id_token** 을 Bearer 로 보내면 받아줘야 할까? 막는다면 무엇으로 구분할까?
3. access_token 의 `sub` 와 응답의 `sub` 가 달라도 될까?

## 만들 것

### ① e2e 먼저 (빨간불)
- [x] 정상: /token 으로 받은 access_token → 200, `sub` 가 id_token 의 `sub` 와 같음 (e2e 10)
- [ ] scope 에 따라 claim: `openid` 만이면 `sub` 만, `email profile` 이면 email·name 등 (e2e 15, 다음 할 일)
- [x] Authorization 헤더 없음 → 401 + `WWW-Authenticate: Bearer` (e2e 11)
- [x] 위조/깨진 토큰 → 401 `invalid_token` (e2e 12)
- [x] 만료된 토큰 → 401 `invalid_token` (e2e 14: 서버 서명 키로 `exp` 만 과거로 다시 서명)
- [x] id_token 을 보냄 → 401 (`typ` 이 `at+jwt` 아님) (e2e 13, 구현 없이 바로 초록불)
- [ ] 사용자가 없음(삭제) → 401 `invalid_token` (e2e 16, 2026-11-19 추가)

### ② 구현 (초록불)
- [x] `Bearer ` 헤더에서 토큰 꺼내기
- [ ] 검증: 서명(공개키, `kid` 로 찾기), `alg` RS256 고정, `exp`, `iss`, `aud`, `typ: at+jwt` (`aud` 만 남음. 나머지는 `jwtVerify` 옵션·기본 검사, 실패 → `'token_verify_failed'`)
- [ ] `sub` 로 사용자 조회 (`UsersReader`), 없으면 401
- [ ] scope → claim (id_token 과 같은 규칙. 중복이면 함께 쓰도록 정리 고려). 값은 user 에서, **넣을지 말지는 scope 로** (2026-11-19 결정)
- [x] 계층: 컨트롤러 → Service → Manager(검증·판단) → Reader (실패는 이유 문자열 → 컨트롤러 `bearerUnauthorized` 가 401)

## 완료 확인 방법

1. 위 e2e 전부 초록불
2. 확인 질문 3개 답변
