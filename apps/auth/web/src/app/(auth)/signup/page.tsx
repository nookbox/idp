'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { useCurrentSearch } from '@/lib/use-current-search';
import { SubmitButton } from '@/components/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다')
    .regex(/\d/, '숫자를 포함해야 합니다')
    .regex(/[^a-zA-Z0-9]/, '특수문자를 포함해야 합니다'),
});

type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const router = useRouter();
  const currentSearch = useCurrentSearch();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: standardSchemaResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const { data, error } = await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
    });
    setLoading(false);

    if (error) {
      console.error('가입에러:', error);
      toast.error(error.message ?? '가입에 실패했습니다');
      return;
    }

    const redirectUrl = (data as { url?: string } | null)?.url;
    if (redirectUrl) {
      window.location.assign(redirectUrl);
    } else {
      router.push('/signin');
    }
  }

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">회원가입</h1>
        <p className="text-sm text-muted-foreground mt-1">
          새 계정을 만들어보세요
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">이름</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
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
            autoComplete="new-password"
            {...register('password')}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              숫자·특수문자 포함 8자 이상
            </p>
          )}
        </div>
        <SubmitButton loading={loading} loadingText="가입 중">
          가입하기
        </SubmitButton>
      </form>
      <p className="text-sm text-muted-foreground text-center">
        이미 계정이 있으신가요?{' '}
        <Link
          href={`/signin${currentSearch}`}
          className="underline hover:text-foreground"
        >
          로그인
        </Link>
      </p>
    </div>
  );
}
