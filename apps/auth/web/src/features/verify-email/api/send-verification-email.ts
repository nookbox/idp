import { authClient } from '@/shared/api/auth-client';

export function sendVerificationEmail(email: string) {
  return authClient.sendVerificationEmail({
    email,
    // 링크를 누르면 인증 처리 후 이 주소로 되돌아온다.
    callbackURL: `${window.location.origin}/?verified=1`,
  });
}
