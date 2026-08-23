import { getAuthErrorMessage } from '@/shared/lib/auth-error';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { requestPasswordReset } from '../api/request-password-reset';
import {
  FORGOT_PASSWORD_FALLBACK_ERROR,
  RESEND_COOLDOWN_SECONDS,
} from './constants';
import { ForgotPasswordFormValues, forgotPasswordSchema } from './schema';

export function useForgotPasswordForm() {
  // 발송에 성공한 주소. 값이 생기면 화면이 안내문으로 넘어간다.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: standardSchemaResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function send(email: string) {
    const { error } = await requestPasswordReset(email);

    if (error) {
      toast.error(getAuthErrorMessage(error, FORGOT_PASSWORD_FALLBACK_ERROR));
      return false;
    }

    setSentTo(email);
    setCooldown(RESEND_COOLDOWN_SECONDS);
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
