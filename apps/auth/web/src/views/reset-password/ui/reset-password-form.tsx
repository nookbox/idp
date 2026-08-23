'use client';

import { FloatingLabelInput } from '@/shared/ui/floating-label-input';
import { SubmitButton } from '@/shared/ui/submit-button';
import { useResetPasswordForm } from '../model/use-reset-password-form';

export function ResetPasswordForm({ token }: { token: string }) {
  const { register, errors, isSubmitting, onSubmit } =
    useResetPasswordForm(token);

  return (
    <>
      <div className="pb-2">
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight text-balance">
          새 비밀번호를 정해주세요
        </h1>
        <h2 className="text-lg/10 font-semibold text-white/70">
          변경하면 모든 기기에서 로그아웃돼요
        </h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <FloatingLabelInput
            labelName="새 비밀번호"
            id="password"
            type="password"
            autoComplete="new-password"
            autoFocus
            {...register('password')}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              숫자·특수문자 포함 8자 이상
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <FloatingLabelInput
            labelName="새 비밀번호 확인"
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            {...register('passwordConfirm')}
          />
          {errors.passwordConfirm && (
            <p className="text-xs text-destructive">
              {errors.passwordConfirm.message}
            </p>
          )}
        </div>

        <SubmitButton loading={isSubmitting} loadingText="변경 중">
          비밀번호 변경
        </SubmitButton>
      </form>
    </>
  );
}
