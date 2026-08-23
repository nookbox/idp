import { getAuthErrorMessage } from '@/shared/lib/auth-error';
import { useCooldown } from '@/shared/lib/use-cooldown';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { requestPasswordReset } from '../api/request-password-reset';
import {
  FORGOT_PASSWORD_COOLDOWN_KEY,
  FORGOT_PASSWORD_FALLBACK_ERROR,
  RESEND_COOLDOWN_SECONDS,
} from './constants';
import { ForgotPasswordFormValues, forgotPasswordSchema } from './schema';

export function useForgotPasswordForm() {
  // 발송에 성공한 주소. 값이 생기면 화면이 안내문으로 넘어간다.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { remaining: cooldown, start } = useCooldown(
    FORGOT_PASSWORD_COOLDOWN_KEY,
  );

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: standardSchemaResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function send(email: string) {
    const { error, retryAfter } = await requestPasswordReset(email);

    if (error) {
      // 429 라면 서버가 남은 시간을 알려준다. 화면 쿨다운이 새로고침으로
      // 날아갔거나 서버 규칙과 어긋나 있어도 여기서 실제 값으로 맞춰진다.
      if (retryAfter) start(retryAfter);

      toast.error(getAuthErrorMessage(error, FORGOT_PASSWORD_FALLBACK_ERROR));
      return false;
    }

    setSentTo(email);
    start(RESEND_COOLDOWN_SECONDS);
    return true;
  }

  const resend = async () => {
    if (cooldown > 0) return;
    if (await send(getValues('email'))) {
      toast.success('메일을 다시 보냈습니다.');
    }
  };

  return {
    register,
    errors,
    isSubmitting,
    sentTo,
    cooldown,
    resend,
    onSubmit: handleSubmit((values) => send(values.email)),
  };
}
