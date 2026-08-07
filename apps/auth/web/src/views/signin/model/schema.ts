import { z } from 'zod';

export const SigninSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
  saveEmail: z.boolean(),
});

export type SigninFormValues = z.infer<typeof SigninSchema>;
