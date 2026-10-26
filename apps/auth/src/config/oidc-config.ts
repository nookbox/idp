import { z } from 'zod';

const schema = z.object({
  OIDC_ISSUER: z
    .url()
    .refine(
      (s) => !s.endsWith('/'),
      '끝에 / 를 붙이지 마세요 (iss 정확히 일치해야 함)',
    ),
  // todo: 이후 나머지 oidcConfig env도 하나씩 옮겨 오기
  JWKS_ENCRYPTION_KEY: z
    .string()
    .refine(
      (s) => Buffer.from(s, 'base64').length === 32,
      'base64 32바이트여야 합니다 (openssl rand -base64 32)',
    ),

  DEV_LOGIN_USER_ID: z.string().optional(), // 개발 환경에서 로그인할 사용자 ID
});

export const env = schema.parse(process.env);
