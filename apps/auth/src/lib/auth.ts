import { betterAuth } from 'better-auth';
import { createAuthMiddleware, APIError } from 'better-auth/api';
import { jwt, admin, emailOTP, multiSession } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { oauthProvider } from '@better-auth/oauth-provider';
import { CF_CONNECTING_IP_HEADER } from '../common/constants';
import { db } from '../database/client';
import {
  findBackchannelTargets,
  notifyBackchannelLogout,
  type BackchannelTarget,
} from './backchannel-logout';
import {
  OTP_EXPIRES_IN_SECONDS,
  RESET_PASSWORD_LINK_EXPIRES_IN_SECONDS,
  VERIFY_LINK_EXPIRES_IN_SECONDS,
  sendOtpEmail,
  sendResetPasswordLinkEmail,
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

/**
 * 세션 삭제 훅의 before -> after 사이에서만 산다. 세션 id 로 넣고 바로 뺀다.
 * DELETE 자체가 터지면 after 가 안 돌아 항목이 남지만, 행당 문자열 몇 개라
 * 무시할 만하고 그 상황이면 이미 DB 가 죽은 거다.
 */
const pendingTargets = new Map<string, BackchannelTarget[]>();

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
        // 비밀번호가 새로 정해지는 모든 경로. 하나라도 빠지면 그 경로로 들어온
        // 비밀번호는 숫자·특수문자 검사를 건너뛴다.
        // (/reset-password 는 body 가 newPassword 라 아래 fallback 이 받는다)
        matcher: (ctx: { path?: string }) =>
          ctx.path === '/sign-up/email' ||
          ctx.path === '/change-password' ||
          ctx.path === '/reset-password',
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
    ipAddress: {
      // 클라우드플레어 헤더값으로 통일
      ipAddressHeaders: [CF_CONNECTING_IP_HEADER],
    },
  },
  rateLimit: {
    // 기본값은 production 에서만 켜진다. 개발에서도 동작을 확인할 수 있게
    // 명시적으로 켠다(끄고 싶으면 DISABLE_RATE_LIMIT=1).
    enabled: process.env.DISABLE_RATE_LIMIT !== '1',
    // 기본 10초/100회. 창을 늘려 순간 폭주가 아니라 지속 폭주를 잡는다.
    window: 60,
    max: 120,
    // 저장소는 메모리가 기본이라 컨테이너를 재시작하면 카운터가 날아간다.
    // 'database' 로 두면 rateLimit 테이블에 쌓여 재시작을 넘어 유지된다.
    storage: 'memory',
    customRules: {
      '/sign-up/email': { window: 300, max: 5 },
      '/send-verification-email': { window: 300, max: 3 },
      '/forget-password': { window: 300, max: 3 },
      '/request-password-reset': { window: 300, max: 3 },
      // 토큰 대입 방어. 재설정 토큰은 1회용이라 성공하면 소진되지만,
      // 틀린 토큰은 얼마든지 다시 던질 수 있어 여기서 막는다.
      '/reset-password': { window: 300, max: 10 },
      '/email-otp/send-verification-otp': { window: 300, max: 3 },

      '/sign-in/email': { window: 60, max: 10 },
    },
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
        // 통지 대상은 여기서 뽑아둬야 한다. oauth_access_token / oauth_refresh_token
        // 의 session_id 가 onDelete: 'set null' 이라, 행이 지워진 뒤엔 이 세션이
        // 어느 RP 에 물려 있었는지 알 방법이 없다.
        before: async (session) => {
          try {
            pendingTargets.set(
              session.id,
              await findBackchannelTargets(session.id),
            );
          } catch (error) {
            console.error('[backchannel-logout] 통지 대상 조회 실패:', error);
          }
        },
        after: (session) => {
          const targets = pendingTargets.get(session.id);
          pendingTargets.delete(session.id);
          if (!targets) return Promise.resolve();

          // 기다리지 않는다. RP 가 죽어 있으면 타임아웃까지 붙잡히고,
          // 여러 행이 한 번에 지워지면 그만큼 쌓인다. 실패는 안에서 삼킨다.
          void notifyBackchannelLogout({
            id: session.id,
            userId: session.userId,
            targets,
          });

          return Promise.resolve();
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: RESET_PASSWORD_LINK_EXPIRES_IN_SECONDS,
    /**
     * 재설정에 성공하면 그 계정의 모든 세션을 끊는다. 비밀번호를 잊었다는 건
     * 계정을 뺏겼을 수도 있다는 뜻이라, 남의 기기에 살아 있는 세션을 남기면 안 된다.
     * 세션 삭제는 databaseHooks 를 거치므로 RP 백채널 로그아웃도 같이 나간다.
     */
    revokeSessionsOnPasswordReset: true,
    /**
     * `url` 은 better-auth 가 만들어 준다:
     */
    async sendResetPassword({ user, url }) {
      await sendResetPasswordLinkEmail({
        email: user.email,
        url,
        userName: user.name,
      });
    },
  },
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
  disabledPaths: [
    '/token',
    // 비밀번호 재설정은 메일 링크 방식 하나로만 간다. emailOTP 플러그인이
    // 자동으로 여는 코드 방식 재설정 경로는 닫아 둔다. 열어두면 정책·레이트리밋을
    // 두 벌 관리해야 하고, 둘 중 약한 쪽이 그 계정의 실질 보안 수준이 된다.
    '/forget-password/email-otp',
    '/email-otp/request-password-reset',
    '/email-otp/reset-password',
  ],
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
          case 'change-email': // 계정 이메일 주소 변경
            await sendOtpEmail({ email, otp, purpose: type });
            break;
          // 'forget-password' 는 나가지 않는다. 재설정은 메일 링크 방식이라
          // 해당 경로를 disabledPaths 로 닫아 두었다.
          case 'forget-password':
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
