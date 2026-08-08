'use client';

import { SubmitButton } from '@/shared/button';
import { FloatingLabelInput } from '@/components/input';
import AuthLink from '@/components/link/auth-link';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Controller } from 'react-hook-form';
import { useSignupForm } from '../model/use-signup-form';
import { PrivacyPolicyDialog } from './privacy-policy-dialog';

export function SignupForm() {
  const { onSubmit, register, errors, control, isSubmitting } = useSignupForm();

  return (
    <>
      <div className="pb-2">
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight text-balance ">
          새 계정을 만들어보세요
        </h1>
        <h2 className="text-lg/10 font-semibold text-white/70 ">
          몇 초면 충분해요
        </h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
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
            <PrivacyPolicyDialog>
              <Label
                htmlFor="privacy"
                className="text-sm font-normal cursor-pointer inline-block leading-relaxed"
              >
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="underline text-sky-400 hover:text-sky-300"
                  >
                    개인정보 처리방침
                  </button>
                </DialogTrigger>
                에 따른 개인정보 수집 및 활용에 동의합니다.{' '}
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="underline text-sky-400 hover:text-sky-300"
                  >
                    (상세 정보)
                  </button>
                </DialogTrigger>
              </Label>
            </PrivacyPolicyDialog>
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
        <AuthLink href="/signin" className="underline hover:text-foreground">
          로그인
        </AuthLink>
      </div>
    </>
  );
}
