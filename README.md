# idp

nookbox identity provider — OIDC / OAuth 2.0 인증 서버.

- `apps/auth` — NestJS + [better-auth](https://better-auth.com) 기반 IdP (OIDC discovery, OAuth provider)
- `apps/auth/web` — 로그인/동의 화면 (Next.js)

이 IdP 를 쓰는 앱들(웹·모바일·게임)은 표준 OIDC 로만 연결되며, 각자 별도 레포로 관리된다.

## 개발

```bash
pnpm install
pnpm dev        # auth 서버 + 로그인 web 동시 실행
```

