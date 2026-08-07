'use client';

import { SubmitButton } from '@/components/button';
import { FloatingLabelInput } from '@/components/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useSigninForm } from '../model/use-signin-form';

export function SigninForm() {
  const { errors, onSubmit, register, saveEmail, setSaveEmail, isSubmitting } =
    useSigninForm();

  return (
    <form onSubmit={onSubmit} className="space-y-4  ">
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
  );
}
