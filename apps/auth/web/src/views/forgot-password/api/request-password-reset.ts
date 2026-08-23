import { authClient } from '@/shared/api/auth-client';

/**
 * 재설정 링크 발송을 요청한다.
 *
 * 가입 여부와 무관하게 항상 성공을 돌려준다(계정 열거 방지). 화면도 그에 맞춰
 * "메일을 보냈다"는 안내만 하고, 그 주소가 가입돼 있는지는 알려주지 않는다.
 *
 * redirectTo 는 서버가 토큰을 확인한 뒤 사용자를 돌려보낼 주소다.
 * auth 서버의 trustedOrigins 안에 있어야 통과한다.
 */
export function requestPasswordReset(email: string) {
  return authClient.requestPasswordReset({
    email,
    redirectTo: `${window.location.origin}/reset-password`,
  });
}
