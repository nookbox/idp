import { z } from 'zod';

const schema = z.object({
  OIDC_ISSUER: z
    .url('OIDC_ISSUER 가 없거나 URL 형식이 아닙니다')
    .refine(
      (s) => !s.endsWith('/'),
      '끝에 / 를 붙이지 마세요 (iss 정확히 일치해야 함)',
    ),

  JWKS_ENCRYPTION_KEY: z
    .string('JWKS_ENCRYPTION_KEY 가 없습니다 (openssl rand -base64 32)')
    .refine(
      (s) => Buffer.from(s, 'base64').length === 32,
      'base64 32바이트여야 합니다 (openssl rand -base64 32)',
    ),

  OIDC_CONSENT_SECRET: z
    .string('OIDC_CONSENT_SECRET 이 없습니다 (openssl rand -base64 32)')
    .refine(
      (s) => Buffer.from(s, 'base64').length >= 32,
      'base64 32바이트 이상이어야 합니다 (openssl rand -base64 32)',
    ),

  // 동의 화면이 있는 web 주소. 동의 URL 을 만들 때, 그리고 POST /consent 의 Origin 검사에 쓴다
  WEB_URL: z.url('WEB_URL 이 없거나 URL 형식이 아닙니다'),

  DEV_LOGIN_USER_ID: z.string().optional(), // 개발 환경에서 로그인할 사용자 ID
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
