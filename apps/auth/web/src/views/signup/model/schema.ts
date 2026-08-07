import { nameSchema } from '@/entities/user';
import { z } from 'zod';

export const schema = z.object({
  name: nameSchema,
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다')
    .regex(/\d/, '숫자를 포함해야 합니다')
    .regex(/[^a-zA-Z0-9]/, '특수문자를 포함해야 합니다'),
  privacy: z.boolean().refine((v) => v, '개인정보 처리방침에 동의해주세요'),
  marketing: z.boolean(),
});

export type FormValues = z.infer<typeof schema>;
