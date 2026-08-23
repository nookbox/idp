import { getAuthErrorMessage } from '@/shared/lib/auth-error';
import { useCooldown } from '@/shared/lib/use-cooldown';
import { useState } from 'react';
import { toast } from 'sonner';
import { sendVerificationEmail } from '../api/send-verification-email';
import {
  VERIFY_EMAIL_COOLDOWN_KEY,
  VERIFY_EMAIL_FALLBACK_ERROR,
  RESEND_COOLDOWN_SECONDS,
} from './constants';

export function useEmailVerification(email: string) {
  const [sending, setSending] = useState(false);
  const { remaining: cooldown, start } = useCooldown(VERIFY_EMAIL_COOLDOWN_KEY);

  const send = async () => {
    setSending(true);
    const { error, retryAfter } = await sendVerificationEmail(email);
    setSending(false);

    if (error) {
      // 429 라면 서버가 남은 시간을 알려준다. 화면 쿨다운이 새로고침으로
      // 날아갔거나 서버 규칙과 어긋나 있어도 여기서 실제 값으로 맞춰진다.
      if (retryAfter) start(retryAfter);

      toast.error(getAuthErrorMessage(error, VERIFY_EMAIL_FALLBACK_ERROR));
      return;
    }

    start(RESEND_COOLDOWN_SECONDS);

    toast.success('인증 이메일을 보냈습니다.', {
      description: '메일이 보이지 않으면 스팸함도 확인해 주세요',
      classNames: { description: 'text-white/55! text-[15px]!' },
      duration: 5000,
    });
  };

  return { sending, cooldown, send };
}
