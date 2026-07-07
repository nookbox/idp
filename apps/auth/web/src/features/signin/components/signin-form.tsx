'use client';

import { SubmitButton } from '@/components/button';
import { FloatingLabelInput } from '@/components/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const SAVED_EMAIL_KEY = 'auth:saved-email';

const ERROR_MESSAGES: Record<string, string> = {
  'Invalid email or password': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Invalid email': '올바른 이메일 형식이 아닙니다.',
  'Invalid password': '비밀번호가 올바르지 않습니다.',
  'Email not verified': '이메일 인증이 완료되지 않았습니다.',
  'User not found': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Failed to create session':
    '로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

function getSavedEmail(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(SAVED_EMAIL_KEY) ?? '';
}

function getErrorMessage(message?: string): string {
  if (!message) return '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.';
  return (
    ERROR_MESSAGES[message] ??
    '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'
  );
}

const schema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
  saveEmail: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function SigninForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: { email: '', password: '', saveEmail: false },
  });

  useEffect(() => {
    // 클라이언트에서만 실행되어 하이드레이션 에러 방지
    const savedValue = getSavedEmail();
    if (savedValue) {
      reset({ email: savedValue, saveEmail: true });
    }
  }, [reset]);

  async function onSubmit(values: FormValues) {
    if (values.saveEmail) {
      localStorage.setItem(SAVED_EMAIL_KEY, values.email);
    } else {
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }

    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      console.error('Login error:', error);
      toast.error(getErrorMessage(error.message));
      return;
    }

    const redirectUrl = (data as { url?: string } | null)?.url;
    if (redirectUrl) {
      window.location.assign(redirectUrl);
    } else {
      router.push('/');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4  ">
      <div className="space-y-1.5">
        <FloatingLabelInput
          labelName="이메일"
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <FloatingLabelInput
          labelName="비밀번호"
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="save-email"
          checked={watch('saveEmail')}
          onCheckedChange={(checked) => setValue('saveEmail', checked === true)}
        />
        <Label
          htmlFor="save-email"
          className="text-sm font-normal cursor-pointer"
        >
          이메일 저장
        </Label>
      </div>
      <SubmitButton loading={isSubmitting} loadingText="로그인 중">
        로그인
      </SubmitButton>
    </form>
  );
}
