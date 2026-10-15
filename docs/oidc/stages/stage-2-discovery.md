# 단계 2: Discovery 문서 만들기

> 상태: ⬜ 단계 1 다음 (과제 미리 준비)
> 전체 로드맵·학습 로그·오답 노트는 [SPEC.md](../SPEC.md). 이 문서는 단계 2 구현 과제와 리뷰 기록만 담는다.

## 무엇을 만드나

RP 가 우리 IdP 를 처음 만났을 때 "로그인은 어디로 보내? 토큰은 어디서 받아? 공개키는 어디 있어?"를
**한 번에 알려주는 안내문**이다. RP 는 이 주소 하나만 알면 나머지 주소를 전부 여기서 읽는다.

> 놀이공원 비유: 주민센터 입구에 붙은 **층별 안내도**. "신원 확인은 2층, 신분증 발급은 3층, 도장 견본은 1층 게시판"

```
GET http://localhost:3001/api/oidc/.well-known/openid-configuration
→ { "issuer": "...", "authorization_endpoint": "...", ... }
```

## 준비

- 브랜치: `feature/oidc`
- better-auth 가 이미 `/api/auth` 를 쓰고 있다. 우리가 만드는 IdP 는 **`/api/oidc`** 아래에 둔다. (단계 10 에서 정리)
- `apps/auth/.env` 에 추가:
  ```
  OIDC_ISSUER=http://localhost:3001/api/oidc
  ```

## 만들 것

### ① 모듈 뼈대
- [ ] `apps/auth/src/modules/oidc/` 에 모듈과 컨트롤러 만들기 (`oidc.module.ts`, `oidc.controller.ts`)
- [ ] `app.module.ts` 에 등록
- 참고: 같은 폴더의 `avatars` 모듈이 이 레포의 모듈 작성 방식이다. 그대로 따라 하면 된다.
- 컨트롤러 경로를 `oidc` 로 두면 전역 prefix `api` 가 붙어서 `/api/oidc/...` 가 된다 (`main.ts` 의 `setGlobalPrefix`)

### ② `GET /api/oidc/.well-known/openid-configuration`
JSON 으로 아래 항목을 돌려준다.

- [ ] `issuer`: `.env` 의 `OIDC_ISSUER` 값 **그대로**
- [ ] `authorization_endpoint`: `{issuer}/authorize`
- [ ] `token_endpoint`: `{issuer}/token`
- [ ] `userinfo_endpoint`: `{issuer}/userinfo`
- [ ] `jwks_uri`: `{issuer}/jwks`
- [ ] `response_types_supported`: `["code"]`
- [ ] `subject_types_supported`: `["public"]`
- [ ] `id_token_signing_alg_values_supported`: `["RS256"]`
- [ ] `scopes_supported`: `["openid", "profile", "email", "offline_access"]`
- [ ] `code_challenge_methods_supported`: `["S256"]`
- [ ] `token_endpoint_auth_methods_supported`: `["client_secret_basic"]`

> authorize, token, userinfo, jwks 는 **아직 없어도 된다.** 단계 3~7 에서 하나씩 만든다. 지금은 "주소를 알려주기"만.

## 힌트 (필요할 때만)

- `.well-known` 처럼 점으로 시작하는 경로도 Nest `@Get('.well-known/openid-configuration')` 로 그냥 된다.
- 환경변수는 `process.env.OIDC_ISSUER`. 없으면 서버가 켜질 때 바로 에러를 내는 게 좋다. 조용히 틀린 issuer 로 도는 게 더 위험하다.
- 주소 조립할 때 issuer 끝에 `/` 가 붙어 있으면 `//authorize` 가 된다. 조심.

## 완료 확인 방법

```bash
curl -s http://localhost:3001/api/oidc/.well-known/openid-configuration | jq
```
1. JSON 이 나오고 위 11개 항목이 다 있다
2. `issuer` 가 `.env` 값과 **글자 하나까지** 같다 (끝에 `/` 없음)
3. 나머지 주소들이 전부 `issuer` 로 시작한다
4. 기존 better-auth 주소(`/api/auth/.well-known/openid-configuration`)도 여전히 잘 나온다 (안 깨뜨렸는지)

## 만들면서 생각해볼 질문

- RP 가 주소를 하드코딩하지 않고 이 문서에서 읽으면 뭐가 좋을까?
- 여기 적은 `issuer` 가 나중에 발급하는 토큰의 `iss` 와 한 글자라도 다르면 무슨 일이 생길까? (복습 Q2 떠올리기)

> 내 답:
>
> -
> -

## 리뷰 기록

> 학습자가 "단계 2 다 했어"라고 하면 멘토가 여기에 날짜별로 지적·잘한 점·수정 여부를 기록한다.

(아직 없음)
