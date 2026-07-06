import { betterAuth } from 'better-auth';
import { createAuthMiddleware, APIError } from 'better-auth/api';
import { jwt } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { oauthProvider } from '@better-auth/oauth-provider';
import { db } from '../database/client';

const authServerUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3001';
const authWebUrl = process.env.WEB_URL ?? 'http://localhost:3000';
const oidcScopes = ['openid', 'profile', 'email', 'offline_access'];

const corsOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const trustedOrigins = [
  ...new Set([authServerUrl, authWebUrl, ...corsOrigins]),
];

// 완성형 한글·영문만 (자음/모음 단독 불가), 단어 사이 단일 공백만 허용
const NAME_PATTERN = /^[가-힣a-zA-Z]+( [가-힣a-zA-Z]+)*$/;

const passwordPolicyPlugin = {
  id: 'password-policy' as const,
  hooks: {
    before: [
      {
        matcher: (ctx: { path?: string }) =>
          ctx.path === '/sign-up/email' || ctx.path === '/update-user',
        handler: createAuthMiddleware(async (ctx) => {
          const name = (ctx.body as Record<string, unknown> | undefined)?.name;
          if (typeof name !== 'string') return;

          if (
            name.trim() !== name ||
            name.length < 2 ||
            name.length > 30 ||
            !NAME_PATTERN.test(name)
          ) {
            throw new APIError('BAD_REQUEST', {
              message:
                '이름은 한글·영문 2~30자여야 합니다 (자음·모음 단독, 앞뒤 공백 불가).',
            });
          }
        }),
      },
      {
        matcher: (ctx: { path?: string }) =>
          ctx.path === '/sign-up/email' || ctx.path === '/change-password',
        handler: createAuthMiddleware(async (ctx) => {
          const body = ctx.body as Record<string, unknown> | undefined;
          const password = body?.password ?? body?.newPassword;
          if (typeof password !== 'string') return;

          if (!/\d/.test(password)) {
            throw new APIError('BAD_REQUEST', {
              message: '비밀번호에 숫자가 포함되어야 합니다.',
            });
          }
          if (!/[^a-zA-Z0-9]/.test(password)) {
            throw new APIError('BAD_REQUEST', {
              message: '비밀번호에 특수문자가 포함되어야 합니다.',
            });
          }
        }),
      },
    ],
  },
};

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  trustedOrigins,
  user: {
    additionalFields: {
      marketingConsent: {
        type: 'boolean',
        defaultValue: false,
        input: true, // 회원가입 시 클라이언트가 값을 보낼 수 있게 허용
      },
    },
  },
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  disabledPaths: ['/token'],
  plugins: [
    passwordPolicyPlugin,
    jwt({
      jwks: {
        keyPairConfig: { alg: 'RS256' },
      },
    }),
    oauthProvider({
      loginPage: `${authWebUrl}/signin`,
      consentPage: `${authWebUrl}/consent`,
      signup: {
        page: `${authWebUrl}/signup`,
      },
      scopes: oidcScopes,
      clientRegistrationDefaultScopes: oidcScopes,
      clientRegistrationAllowedScopes: oidcScopes,
      allowDynamicClientRegistration: false,
      silenceWarnings: {
        oauthAuthServerConfig: true,
        openidConfig: true,
      },
    }),
  ],
});
