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

const passwordPolicyPlugin = {
  id: 'password-policy' as const,
  hooks: {
    before: [
      {
        matcher: (ctx: { path?: string }) => ctx.path === '/sign-up/email',
        handler: createAuthMiddleware(async (ctx) => {
          const password = (ctx.body as Record<string, unknown> | undefined)
            ?.password;
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
