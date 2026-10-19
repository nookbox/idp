# 단계 3: 서명키 만들기 & `GET /jwks`

> 시작: 2026-10-19 · 상태: ⏳ 진행 중
> 전체 로드맵·학습 로그·오답 노트는 [SPEC.md](../SPEC.md). 이 문서는 단계 3 구현 과제와 리뷰 기록만 담는다.

## 무엇을 만드나

정리 문서([위키 "oidc 헷갈렸던 부분들 정리"](https://github.com/nookbox/idp/wiki/%EA%B8%B0%EB%A1%9D-oidc-%EC%A0%95%EB%A6%AC)) 10번(id_token 검증)에서
RP 는 "**/jwks 공개키로 서명 확인**"을 한다. 그 공개키를 내주는 주소를 만든다.

- IdP 가 **개인키**로 id_token 에 서명한다 (단계 5 에서)
- RP 는 `/jwks` 에서 받은 **공개키**로 그 서명이 진짜인지 확인한다
- 이번 단계는 ① 키 쌍 만들고 저장하기 ② 공개키만 `/jwks` 로 내주기 까지

```
GET http://localhost:3011/api/oidc/jwks
→ { "keys": [ { "kty": "RSA", "kid": "...", "alg": "RS256", "use": "sig", "n": "...", "e": "AQAB" } ] }
```

## 준비

- `jose` 는 이미 설치돼 있다 (`apps/auth/package.json`)
- better-auth 도 `jwks` 라는 테이블을 쓰고 있다 (`src/database/schema/auth.ts`). **건드리지 말고** 우리 테이블은 이름을 다르게 (`oidc_signing_key`). 단계 10 에서 정리
- 스키마는 `src/database/schema/` 에 새 파일(`oidc.ts`)로 두고 `index.ts` 에서 export. 마이그레이션은 `pnpm db:generate` → `pnpm db:migrate`

## 만들 것

### ① 테이블 `oidc_signing_key`
- [ ] `kid` (PK, 키 쌍의 이름표. 만들 때 한 번 정함 — 0-7 복습)
- [ ] `public_jwk` (공개키, JWK JSON)
- [ ] `private_jwk` (개인키, JWK JSON) — 지금은 평문 저장 OK, 아래 "도전 과제" 참고
- [ ] `active` (지금 서명에 쓰는 키인지), `created_at`

### ② 키 준비
- [ ] 서버가 켜질 때 `active` 키가 없으면 RS256 키 쌍을 새로 만들어 저장
- [ ] 이미 있으면 새로 만들지 않는다 (재시작할 때마다 키가 바뀌면 이전에 발급한 토큰이 전부 검증 실패)
- 쓸 함수: jose 의 `generateKeyPair('RS256', { extractable: true })`, `exportJWK()`
- Nest 에서는 서비스의 `onModuleInit()` 이 "켜질 때 한 번" 실행되는 자리다

### ③ `GET /api/oidc/jwks`
- [ ] 응답 모양: `{ "keys": [ ... ] }`
- [ ] 각 키에 `kid`, `kty`, `alg: "RS256"`, `use: "sig"` 포함
- [ ] **공개키만**. 개인키 전용 필드(`d`, `p`, `q`, `dp`, `dq`, `qi`)가 하나라도 있으면 안 된다
- [ ] 로그인 없이 열려야 한다 (`@AllowAnonymous()`, 단계 2 처럼 메서드에)

## 힌트 (필요할 때만)

- `exportJWK(publicKey)` 결과에는 `kid`, `alg`, `use` 가 안 들어 있다. 직접 붙여야 한다
- 공개키 JWK 를 따로 저장해 두면 `/jwks` 는 DB 에서 읽어서 그대로 내주기만 하면 된다. 개인키에서 공개키를 빼내려고 필드를 지우는 방식은 실수하기 쉽다
- `kid` 는 `crypto.randomUUID()` 정도면 충분하다

## 완료 확인 방법

```bash
curl -s http://localhost:3011/api/oidc/jwks | jq
```
1. `keys` 배열에 키가 1개 이상
2. `kid`, `kty: "RSA"`, `alg: "RS256"`, `use: "sig"`, `n`, `e` 가 있다
3. `d` 가 **없다** (`curl ... | jq '.keys[].d'` 결과가 `null`)
4. 서버를 껐다 켜도 `kid` 가 그대로다
5. 기존 better-auth `/api/auth/jwks` 도 여전히 나온다

## 도전 과제 (선택)

- `private_jwk` 를 암호화해서 저장하기 (env 의 비밀키 + AES-256-GCM, node `crypto`). DB 가 통째로 새도 개인키는 못 쓰게

## 만들면서 생각해볼 질문

- 키를 교체(rotation)하는 날, `/jwks` 에서 옛 공개키를 **바로 지우면** 무슨 일이 생길까? 누가, 언제까지 영향을 받나? (0-4, 0-7 복습)
- 개인키가 샌 걸 알게 됐다. 무엇을 해야 할까?

> 내 답:
>
> -
> -

## 리뷰 기록

> 학습자가 "단계 3 다 했어"라고 하면 멘토가 여기에 날짜별로 지적·잘한 점·수정 여부를 기록한다.

(아직 없음)
