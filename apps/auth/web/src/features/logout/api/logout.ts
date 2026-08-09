import { authClient } from '@/shared/api/auth-client';

// 이 브라우저에 로그인해둔 모든 계정을 로그아웃한다.
// multiSession 플러그인이 /sign-out 훅에서 _multi-* 쿠키의 세션을 전부 revoke 한다.
export function logoutAll() {
  return authClient.signOut();
}

// 넘긴 세션 하나만 로그아웃한다.
// 남은 계정이 있으면 플러그인이 그중 하나를 활성 세션으로 승격시킨다.
export function logoutCurrent(sessionToken: string) {
  return authClient.multiSession.revoke({ sessionToken });
}
