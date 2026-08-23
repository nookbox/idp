'use client';

import { AuthLink } from '@/shared/ui/auth-link';
import { FloatingLabelInput } from '@/shared/ui/floating-label-input';
import { SubmitButton } from '@/shared/ui/submit-button';
import { useForgotPasswordForm } from '../model/use-forgot-password-form';
import { ResetLinkSentNotice } from './reset-link-sent-notice';

export function ForgotPasswordForm() {
  const {
    register,
    errors,
    isSubmitting,
    sentTo,
    cooldown,
    resend,
    onSubmit,
  } = useForgotPasswordForm();

  if (sentTo) {
    return (
      <ResetLinkSentNotice email={sentTo} cooldown={cooldown} onResend={resend} />
    );
  }

  return (
    <>
      <div className="pb-2">
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight text-balance">
          비밀번호를 잊으셨나요?
        </h1>
        <h2 className="text-lg/10 font-semibold text-white/70">
          가입한 이메일로 재설정 링크를 보내드려요
        </h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <FloatingLabelInput
            labelName="이메일"
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <SubmitButton loading={isSubmitting} loadingText="보내는 중">
          재설정 링크 받기
        </SubmitButton>
      </form>

      <div className="text-sm text-muted-foreground text-center mt-4 flex gap-2 justify-center">
        비밀번호가 기억나셨나요?
        <AuthLink href="/signin" className="underline hover:text-foreground">
          로그인
        </AuthLink>
      </div>
    </>
  );
}
