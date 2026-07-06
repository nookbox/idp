import { z } from 'zod';

// 완성형 한글·영문만 허용 (자음/모음 단독 불가), 단어 사이 단일 공백만 허용
// 서버 검증(apps/auth/src/lib/auth.ts inputPolicyPlugin)과 동일하게 유지
export const nameSchema = z
  .string()
  .trim()
  .min(2, '이름은 2자 이상이어야 합니다')
  .max(30, '이름은 30자 이하여야 합니다')
  .regex(/^[가-힣a-zA-Z]+( [가-힣a-zA-Z]+)*$/, '올바른 이름을 입력해주세요');
