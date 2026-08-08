import { nameSchema, passwordSchema } from '@/entities/user';
import { z } from 'zod';

export const schema = z.object({
  name: nameSchema,
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: passwordSchema,
  privacy: z.boolean().refine((v) => v, '개인정보 처리방침에 동의해주세요'),
  marketing: z.boolean(),
});

export type FormValues = z.infer<typeof schema>;
