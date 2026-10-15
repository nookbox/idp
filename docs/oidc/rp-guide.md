# RP 구현 가이드 (다른 레포용 참고)

> 2026-10-15 결정: **이 레포는 IdP 에만 집중한다. 테스트 RP 도 만들지 않는다.**
> 실제 RP 는 별도 레포에서 만든다. 이 문서는 그때 쓸 RP 쪽 과제 메모다.
> (한때 `apps/rp/server.mjs` 로 테스트 RP 를 만들었다가 삭제함. 아래 '구현' 절은 그 기록이자 참고용 설계)

IdP 는 아직 없다. 이번에는 **RP 쪽의 1~4번, 그리고 7번 state 비교까지**만 만든다.
(위키 그림에서 주황색 RP 서버 부분)

이 테스트 RP 에 나중 단계에서 추가할 일 (IdP 쪽이 준비되면):
- [ ] discovery 문서(`/.well-known/openid-configuration`)에서 엔드포인트 읽기 (하드코딩 금지)
- [ ] code 교환: `POST /token` 에 code, redirect_uri, code_verifier, Basic 인증
- [ ] id_token 검증: JWKS 서명, **alg RS256 고정**, `iss`(설정값과 정확히 일치), `aud`, `exp`, `nonce`. **id_token 이 없으면 실패**
- [ ] `sub`(+iss) 로 회원 찾기/생성 → RP 자체 세션 쿠키 발급

## 참고: 삭제된 테스트 RP 설계 (2026-10-15)

학습자 요청으로 테스트 RP 는 멘토가 만들었다. 학습 대상은 IdP 이고, RP 는 IdP 를 눌러보는 도구다.

- 파일: **`apps/rp/server.mjs`** 하나. 의존성 없음(Node 기본 모듈 `node:http`, `node:crypto` 만 사용). Next.js 아님
- 실행: `node apps/rp/server.mjs` → http://localhost:4000
- 설정은 기본값이 들어 있어서 `.env` 없이 바로 돈다. 바꾸고 싶으면 환경변수로:
  `OIDC_ISSUER`(기본 `http://localhost:3001/api/oidc`), `OIDC_CLIENT_ID`(기본 `shop`), `OIDC_REDIRECT_URI`, `PORT`
- 쿠키 이름은 `rp_state`, `rp_nonce`, `rp_verifier`. localhost 에서 IdP 쿠키와 섞이지 않게 접두어를 붙였다 (쿠키는 포트를 구분하지 않는다)

| 경로 | 하는 일 | 그림 번호 |
|---|---|---|
| `GET /` | 로그인 링크 | ① |
| `GET /login` | state·nonce·verifier 생성 → 쿠키 저장 → challenge 계산 → IdP `/authorize` 로 302 | ②③ |
| `GET /callback` | IdP 에러면 표시. URL state ↔ 쿠키 state 비교, 다르거나 없으면 400. 통과하면 state 쿠키 삭제 후 code 표시 | ⑦ |

체크리스트 (모두 구현됨):
- [x] state 랜덤 생성, 쿠키 저장, callback 에서 비교·불일치 거부
- [x] code_verifier(43자) 생성, `code_challenge = BASE64URL(SHA256(verifier))`, `S256`
- [x] 쿠키 `HttpOnly`, `SameSite=Lax`, 10분 만료
- [x] verifier 는 URL 에 넣지 않음
- [x] 다 쓴 state 쿠키 삭제, nonce·verifier 는 단계 5 용으로 유지
- [x] nonce 도 미리 생성 (단계 5 에서 id_token 의 nonce 와 비교)

## 완료 확인 방법

0. `node apps/rp/server.mjs` 실행 후 http://localhost:4000 접속
1. 버튼 클릭 → 주소창이 `localhost:3001/api/oidc/authorize?...` 로 바뀜 (404 정상). **파라미터 8개**(nonce 포함) 확인
2. 개발자 도구 → Application → Cookies 에서 state, verifier 쿠키 확인
3. `localhost:4000/callback?code=test&state=틀린값` → **거부**
4. 쿠키의 state 값으로 `?state=그값` → **통과**
5. 같은 주소 한 번 더 → 쿠키를 지웠으니 **거부**

## 만들면서 생각해볼 질문

- 쿠키를 왜 `httpOnly` 로 할까?
- state 쿠키를 왜 다 쓰자마자 지울까?

> 내 답:
>
> -
> -

## 리뷰 기록

> 학습자가 "단계 1 다 했어"라고 하면 멘토가 여기에 날짜별로 지적·잘한 점·수정 여부를 기록한다.

- 2026-10-15: 멘토 구현. curl 로 확인 — `/login` 302 + 쿠키 3개 + URL 에 verifier 없음 ✅, 틀린 state 400 ✅, 맞는 state 200 + state 쿠키 삭제 ✅, 재사용 400 ✅, IdP error 파라미터 400 ✅
