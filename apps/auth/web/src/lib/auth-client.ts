import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { oauthProviderClient } from '@better-auth/oauth-provider/client';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3001',
  plugins: [
    // 서버 auth.ts 의 user.additionalFields 와 동일하게 유지
    inferAdditionalFields({
      user: {
        marketingConsent: { type: 'boolean' },
      },
    }),
    // OIDC 흐름 도중 IdP 가 /signin · /signup 으로 redirect 할 때,
    // 원본 authorize 쿼리를 HMAC 서명해 현재 페이지 URL 의 querystring 에 실어 보낸다.
    // 이 플러그인은 window.location.search 를 읽어 그 서명된 쿼리를
    // 모든 auth 요청 body 의 `oauth_query` 필드로 자동 첨부한다.
    // 백엔드 hook 이 sig 를 검증한 뒤 로그인 + authorize 이어주기를 처리.
    oauthProviderClient(),
  ],
});
