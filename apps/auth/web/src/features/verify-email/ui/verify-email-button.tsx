'use client';

import { Button } from '@/shared/ui/button';
import { useEmailVerification } from '../model/use-email-verification';

export function VerifyEmailButton({ email }: { email: string }) {
  const { sending, cooldown, send } = useEmailVerification(email);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={sending || cooldown > 0}
      onClick={send}
    >
      {cooldown > 0 ? `재전송 (${cooldown}초)` : '인증하기'}
    </Button>
  );
}
