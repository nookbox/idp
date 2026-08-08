import { authClient } from '@/shared/api/auth-client';

/**
 * 6자리 코드 방식 이메일 인증.
 *
 * 현재 계정 화면은 링크 방식(send-verification-email.ts)을 쓴다. 이 함수는
 * 코드 입력 화면을 붙일 때를 위해 남겨둔 것이며, 서버의 emailOTP 플러그인
 * (apps/auth/src/lib/auth.ts) 도 'email-verification' 타입을 계속 처리한다.
 */
export function sendVerificationOtp(email: string) {
  return authClient.emailOtp.sendVerificationOtp({
    email,
    type: 'email-verification',
  });
}
