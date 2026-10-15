# 단계 1: 테스트용 RP 만들기

> 시작: 2026-10-15 · 상태: ⏳ 진행 중
> 전체 로드맵·학습 로그·오답 노트는 [SPEC.md](../SPEC.md). 이 문서는 단계 1 구현 과제와 리뷰 기록만 담는다.
> **`apps/rp` 는 우리 IdP 를 눌러보기 위한 테스트용 RP 다.** 실제 서비스 RP 는 별도 레포에서 만든다. 여기서 익힌 걸 그대로 옮겨 쓰면 된다.

IdP 는 아직 없다. 이번에는 **RP 쪽의 1~4번, 그리고 7번 state 비교까지**만 만든다.
(위키 그림에서 주황색 RP 서버 부분)

이 테스트 RP 에 나중 단계에서 추가할 일 (IdP 쪽이 준비되면):
- [ ] discovery 문서(`/.well-known/openid-configuration`)에서 엔드포인트 읽기 (하드코딩 금지)
- [ ] code 교환: `POST /token` 에 code, redirect_uri, code_verifier, Basic 인증
- [ ] id_token 검증: JWKS 서명, **alg RS256 고정**, `iss`(설정값과 정확히 일치), `aud`, `exp`, `nonce`. **id_token 이 없으면 실패**
- [ ] `sub`(+iss) 로 회원 찾기/생성 → RP 자체 세션 쿠키 발급

## 준비

- 브랜치: 기존 `feature/oidc` 에서 그대로 작업
- `apps/rp` 에 Next.js 앱 생성. 포트 **4000** (3000 web, 3001 auth, 3002 mail 사용 중)
- `apps/rp/.env`:
  ```
  OIDC_AUTHORIZE_URL=http://localhost:3001/api/oidc/authorize   # 아직 없음. 단계 4에서 만들 주소
  OIDC_CLIENT_ID=shop
  OIDC_REDIRECT_URI=http://localhost:4000/callback
  ```

## 만들 파일 3개

### ① `app/page.tsx`: 첫 화면
- [ ] "nook으로 로그인" 버튼(링크) 하나. 누르면 `/login` 으로 이동

### ② `app/login/route.ts`: 로그인 시작 (그림 ①~③)
- [ ] `state`: 랜덤 값 생성
- [ ] `code_verifier`: 랜덤 값 생성 (43~128자)
- [ ] `code_challenge`: verifier 를 SHA-256 해시 → base64url
- [ ] state, verifier 를 **쿠키에 저장** (`httpOnly`, `sameSite: 'lax'`, 10분 만료)
- [ ] authorize URL 조립 후 **302**. 파라미터: `response_type=code`, `client_id`, `redirect_uri`,
      `scope=openid profile email`, `state`, `code_challenge`, `code_challenge_method=S256`
- [ ] verifier 는 URL 에 절대 넣지 않는다 (단계 5 의 /token 요청 때만 보냄)

### ③ `app/callback/route.ts`: 돌아오는 곳 (그림 ⑦)
- [ ] URL 의 `state` 와 쿠키의 `state` 비교. **다르거나 없으면 거부**
- [ ] 같으면 "state 확인 완료, code=…" 만 화면에 표시 (code 교환은 단계 5)
- [ ] 다 쓴 state 쿠키 **삭제**. verifier 쿠키는 단계 5 에서 써야 하니 유지

## 힌트 (필요할 때만)

- 랜덤 값과 해시: `node:crypto` 의 `randomBytes`, `createHash`
- base64url: `Buffer` 의 `toString('base64url')`
- 쿠키 읽기/쓰기: `next/headers` 의 `cookies()`. 302 는 `NextResponse.redirect()`

## 완료 확인 방법

1. 버튼 클릭 → 주소창이 `localhost:3001/api/oidc/authorize?...` 로 바뀜 (404 정상). **파라미터 7개** 확인
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

(아직 없음)
