'use client';

import { SubmitButton } from '@/components/button';
import { FloatingLabelInput } from '@/components/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { nameSchema } from '@/lib/name-schema';
import { useCurrentSearch } from '@/lib/use-current-search';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  name: nameSchema,
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다')
    .regex(/\d/, '숫자를 포함해야 합니다')
    .regex(/[^a-zA-Z0-9]/, '특수문자를 포함해야 합니다'),
  privacy: z.boolean().refine((v) => v, '개인정보 처리방침에 동의해주세요'),
  marketing: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const router = useRouter();
  const currentSearch = useCurrentSearch();
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    mode: 'onChange',
    defaultValues: { privacy: false, marketing: false },
  });

  async function onSubmit(values: FormValues) {
    const { data, error } = await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
      marketingConsent: values.marketing,
    });

    if (error) {
      console.error('가입에러:', error);
      toast.error(error.message ?? '가입에 실패했습니다');
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
    <div className="max-w-md w-full pt-10">
      <div className="pb-2">
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight text-balance ">
          새 계정을 만들어보세요
        </h1>
        <h2 className="text-lg/10 font-semibold text-white/70 ">
          몇 초면 충분해요
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <FloatingLabelInput
            labelName="이름"
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

        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <Controller
              control={control}
              name="privacy"
              render={({ field }) => (
                <Checkbox
                  id="privacy"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  className="mt-0.5"
                />
              )}
            />
            <Label
              htmlFor="privacy"
              className="text-sm font-normal cursor-pointer inline-block leading-relaxed"
            >
              <button
                type="button"
                onClick={() => setPrivacyOpen(true)}
                className="underline text-sky-400 hover:text-sky-300"
              >
                개인정보 처리방침
              </button>
              에 따른 개인정보 수집 및 활용에 동의합니다.{' '}
              <button
                type="button"
                onClick={() => setPrivacyOpen(true)}
                className="underline text-sky-400 hover:text-sky-300"
              >
                (상세 정보)
              </button>
            </Label>
          </div>
          {errors.privacy && (
            <p className="text-xs text-destructive">{errors.privacy.message}</p>
          )}
        </div>

        <div className="flex items-start gap-2">
          <Controller
            control={control}
            name="marketing"
            render={({ field }) => (
              <Checkbox
                id="marketing"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                className="mt-0.5"
              />
            )}
          />
          <Label
            htmlFor="marketing"
            className="text-sm font-normal cursor-pointer leading-relaxed"
          >
            NOOKBOX의 특별 프로모션 이메일을 보내주세요. (선택 사항)
          </Label>
        </div>

        <SubmitButton loading={isSubmitting} loadingText="가입 중">
          동의하고 계속
        </SubmitButton>
      </form>

      <div className="text-sm text-muted-foreground text-center mt-4 flex gap-2 justify-center">
        이미 계정이 있으신가요?
        <Link
          href={`/signin${currentSearch}`}
          className="underline hover:text-foreground"
        >
          로그인
        </Link>
      </div>

      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="max-h-[80dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>개인정보 처리방침</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              NOOKBOX는 회원가입 및 서비스 제공을 위해 아래와 같이 개인정보를
              수집·이용합니다.
            </p>
            <p>
              <strong className="text-foreground">수집 항목:</strong> 이름,
              이메일 주소, 비밀번호
            </p>
            <p>
              <strong className="text-foreground">수집 목적:</strong> 회원 식별,
              서비스 제공, 계정 관리
            </p>
            <p>
              <strong className="text-foreground">보유 기간:</strong> 회원 탈퇴
              후 30일간 보관 후 완전 삭제
            </p>
            <p>
              동의를 거부할 권리가 있으며, 동의 거부 시 회원가입이 제한될 수
              있습니다.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
