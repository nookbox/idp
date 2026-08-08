import { authClient } from '@/shared/api/auth-client';

export function sendVerificationOtp(email: string) {
  return authClient.emailOtp.sendVerificationOtp({
    email,
    type: 'email-verification',
  });
}
