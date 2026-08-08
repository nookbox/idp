import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { sendVerificationOtp } from '../api/send-verification-otp';

const RESEND_COOLDOWN_SECONDS = 60;

export function useEmailVerification(email: string) {
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const send = async () => {
    setSending(true);
    const { error } = await sendVerificationOtp(email);
    setSending(false);

    if (error) {
      toast.error(error.message ?? '이메일 전송에 실패했습니다');
      return;
    }
    setCooldown(RESEND_COOLDOWN_SECONDS);

    toast.success('인증 이메일을 보냈습니다.', {
      description: '메일이 보이지 않으면 스팸함도 확인해 주세요',
      classNames: { description: 'text-white/55! text-[15px]!' },
      duration: 5000,
    });
  };

  return { sending, cooldown, send };
}
