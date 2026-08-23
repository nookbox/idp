import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
