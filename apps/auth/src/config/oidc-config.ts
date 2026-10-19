import { z } from 'zod';

const schema = z.object({
  OIDC_ISSUER: z
    .url()
    .refine(
      (s) => !s.endsWith('/'),
      '끝에 / 를 붙이지 마세요 (iss 정확히 일치해야 함)',
    ), // 나머지 oidcConfig env도 하나씩 옮겨 오기
});

export const env = schema.parse(process.env);
