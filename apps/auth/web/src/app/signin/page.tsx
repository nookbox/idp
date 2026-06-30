'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { useCurrentSearch } from '@/lib/use-current-search';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [loading, setLoading] = useState(false);
  const [saveEmail, setSaveEmail] = useState(() => !!getSavedEmail());

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: getSavedEmail(), password: '' },
  });

  async function onSubmit(values: FormValues) {
    if (saveEmail) {
      localStorage.setItem(SAVED_EMAIL_KEY, values.email);
    } else {
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }

    setLoading(true);
    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    setLoading(false);

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
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">로그인</h1>
        <p className="text-sm text-muted-foreground mt-1">
          계정에 로그인하세요
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input
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
          <Label htmlFor="password">비밀번호</Label>
          <Input
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
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? '로그인 중...' : '로그인'}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground text-center">
        계정이 없으신가요?{' '}
        <Link
          href={`/signup${currentSearch}`}
          className="underline hover:text-foreground"
        >
          가입하기
        </Link>
      </p>
    </div>
  );
}
