import { getAuthErrorMessage } from '@/shared/lib/auth-error';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { resetPassword } from '../api/reset-password';
import {
  RESET_PASSWORD_ERROR_MESSAGES,
  RESET_PASSWORD_FALLBACK_ERROR,
} from './constants';
import { ResetPasswordFormValues, resetPasswordSchema } from './schema';

export function useResetPasswordForm(token: string) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: standardSchemaResolver(resetPasswordSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  });

  async function submit(values: ResetPasswordFormValues) {
    const { error } = await resetPassword({
      newPassword: values.password,
      token,
    });

    if (error) {
      toast.error(
        getAuthErrorMessage(
          error,
          RESET_PASSWORD_FALLBACK_ERROR,
          RESET_PASSWORD_ERROR_MESSAGES,
        ),
      );
      return;
    }

    // 서버가 이 계정의 세션을 전부 끊었으므로(revokeSessionsOnPasswordReset)
    // 로그인 화면으로 보내 새 비밀번호로 다시 들어오게 한다.
    toast.success('비밀번호를 변경했습니다. 새 비밀번호로 로그인해주세요.');
    router.replace('/signin');
  }

  return {
    register,
    errors,
    isSubmitting,
    onSubmit: handleSubmit(submit),
  };
}
