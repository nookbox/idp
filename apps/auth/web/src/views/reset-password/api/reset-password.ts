import { authClient } from '@/shared/api/auth-client';

/**
 * 새 비밀번호 확정.
 *
 * token 은 메일 링크를 눌렀을 때 auth 서버가 확인 후 쿼리로 실어 보낸 값이다.
 * 1회용이라 성공하면 그 자리에서 소진된다.
 */
export function resetPassword(params: { newPassword: string; token: string }) {
  return authClient.resetPassword(params);
}
