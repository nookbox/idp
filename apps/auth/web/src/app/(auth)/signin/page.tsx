'use client';

import { SubmitButton } from '@/components/button';
import { FloatingLabelInput } from '@/components/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { useCurrentSearch } from '@/lib/use-current-search';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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

function getErrorMessage(message?: string): string {
  if (!message) return '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.';
  return (
    ERROR_MESSAGES[message] ??
    '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'
  );
}

function getSavedEmail(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(SAVED_EMAIL_KEY) ?? '';
}

const schema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

type FormValues = z.infer<typeof schema>;

export default function SignInPage() {
  const router = useRouter();
  const currentSearch = useCurrentSearch();
  const [saveEmail, setSaveEmail] = useState(() => !!getSavedEmail());

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: { email: getSavedEmail(), password: '' },
  });

  async function onSubmit(values: FormValues) {
    if (saveEmail) {
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
      router.push('/profiles');
    }
  }

  return (
    <div className="max-w-md w-full pt-10">
      <div className="pb-2">
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight text-balance ">
          로그인 정보를 입력하세요
        </h1>
        <h2 className="text-lg/10 font-semibold text-white/70 ">
          아니면 새 계정으로 시작하세요
        </h2>
      </div>

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
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="save-email"
            checked={saveEmail}
            onCheckedChange={(checked) => setSaveEmail(checked === true)}
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

      <div className="text-sm text-muted-foreground text-center mt-4 flex gap-2 justify-center">
        계정이 없으신가요?
        <Link
          href={`/signup${currentSearch}`}
          className="underline hover:text-foreground"
        >
          가입하기
        </Link>
      </div>
    </div>
  );
}
