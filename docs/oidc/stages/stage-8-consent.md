# 단계 8: 동의(consent) — "이 앱에 내 정보를 줘도 될까요?"

> 시작: 2026-11-22 · 상태: 🟡 진행 중
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

## 만들 것

### ① e2e 먼저 (빨간불)
- [ ] 처음 보는 user+client → code 대신 **동의 화면으로** (code 없음)
- [ ] 허용 → code 발급, 그 code 로 받은 토큰의 scope = 허락한 scope
- [ ] 거부 → 302 `error=access_denied` (+ state 그대로), code 없음
- [ ] 이미 동의한 scope 범위 안 → 동의 화면 없이 바로 code
- [ ] 더 넓은 scope 요청 (예: email 동의 후 email profile) → 다시 동의 화면
- [ ] 일부만 허용 (email O, profile X) → /userinfo 에 name 없음 (단계 7 의 18 과 같은 확인)
- [ ] 동의 생략 client → 동의 화면 없이 바로 code

### ② 구현 (초록불) — 설계는 학습자가 정한다
- [ ] 동의 저장소: 키 = **user + client**, 값 = 허락한 scope (테이블·컬럼은 학습자가)
- [ ] client 에 "동의 생략" 표시
- [ ] /authorize: 로그인 확인 뒤 "저장된 동의가 요청 scope 를 덮나" 판단 (Manager)
- [ ] 동의 화면으로 넘길 때 **요청 정보를 어떻게 들고 갈지** (client_id·scope·state·nonce·code_challenge 등). URL 로 그대로 넘기면 무엇이 문제일까?
- [ ] 허용/거부 받는 엔드포인트 (이 요청이 정말 그 사용자가 보낸 건지 — CSRF)
- [ ] 동의 화면 UI (web)

### ③ 철회
- [ ] 계정 화면에서 동의 철회 (기존 `services-section` 연결)
- [ ] 철회 후 /authorize → 다시 동의 화면

## 완료 확인 방법

1. 위 e2e 전부 초록불
2. 확인 질문 3개 답변 (완료)
