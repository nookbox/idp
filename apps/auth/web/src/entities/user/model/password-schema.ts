import { z } from 'zod';

// 서버 검증(apps/auth/src/lib/auth.ts)과 동일하게 유지
export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 8자 이상이어야 합니다')
  .regex(/\d/, '숫자를 포함해야 합니다')
  .regex(/[^a-zA-Z0-9]/, '특수문자를 포함해야 합니다');
