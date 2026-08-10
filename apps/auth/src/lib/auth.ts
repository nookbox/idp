import { betterAuth } from 'better-auth';
import { createAuthMiddleware, APIError } from 'better-auth/api';
import { jwt, admin, emailOTP, multiSession } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { oauthProvider } from '@better-auth/oauth-provider';
import { db } from '../database/client';
import { notifyBackchannelLogout } from './backchannel-logout';
import {
  OTP_EXPIRES_IN_SECONDS,
  VERIFY_LINK_EXPIRES_IN_SECONDS,
  sendOtpEmail,
  sendVerificationLinkEmail,
} from './mailer';

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
  advanced: {
    // 쿠키는 포트를 구분하지 않는다. 로컬에서 IdP 와 RP 가 둘 다 localhost 라
    // 기본 이름을 쓰면 서로 덮어쓴다. RP 쪽과 반드시 다른 값이어야 한다.
    cookiePrefix: 'nook-idp',
  },
  user: {
    additionalFields: {
      marketingConsent: {
        type: 'boolean',
        defaultValue: false,
        input: true, // 회원가입 시 클라이언트가 값을 보낼 수 있게 허용
      },
    },
  },
  databaseHooks: {
    session: {
      // 세션 행이 지워질 때마다 RP 에 알린다(행 단위. 계정 3개면 3번).
      // 엔드포인트가 아니라 DB 레이어에 거는 이유는, 세션을 지우는 API 가
      // /sign-out 말고도 여럿이라(계정 제거, 기기 종료, 비번 변경, 탈퇴...)
      // 하나씩 걸면 빠뜨리기 때문. 여기는 그것들이 다 거쳐가는 길목이다.
      delete: {
        after: (session) => {
          // 기다리지 않는다. RP 가 죽어 있으면 타임아웃까지 붙잡히고,
          // 여러 행이 한 번에 지워지면 그만큼 쌓인다. 실패는 안에서 삼킨다.
          void notifyBackchannelLogout({
            id: session.id,
            userId: session.userId,
          });

          return Promise.resolve();
        },
      },
    },
  },
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  emailVerification: {
    expiresIn: VERIFY_LINK_EXPIRES_IN_SECONDS,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      await sendVerificationLinkEmail({
        email: user.email,
        url,
        userName: user.name,
      });
    },
  },
  disabledPaths: ['/token'],
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: OTP_EXPIRES_IN_SECONDS,
      storeOTP: 'hashed',
      // overrideDefaultEmailVerification 을 켜면 이메일 인증이 링크 대신 OTP 로
      // 나간다. 인증은 emailVerification(링크) 쪽에서 처리하므로 켜지 않는다.

      async sendVerificationOTP({ email, otp, type }) {
        switch (type) {
          case 'email-verification': // emailOtp API 를 직접 부를 때만 (기본 인증은 링크)
          case 'sign-in': // 비밀번호 없이 코드로 로그인
          case 'forget-password': // 비밀번호 재설정
          case 'change-email': // 계정 이메일 주소 변경
            await sendOtpEmail({ email, otp, purpose: type });
            break;
        }
      },
    }),
    passwordPolicyPlugin,
    multiSession({ maximumSessions: 5 }),
    jwt({
      jwks: {
        keyPairConfig: { alg: 'RS256' },
      },
    }),
    admin(),
    oauthProvider({
      clientPrivileges: async ({ user }) =>
        (user as { role?: string | null }).role === 'admin',
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
