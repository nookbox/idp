import { authClient } from '@/shared/api/auth-client';

// 이 브라우저 쿠키에 남아있는 로그인 세션 목록 (유저당 1건으로 중복 제거됨)
export function listDeviceSessions() {
  return authClient.multiSession.listDeviceSessions();
}

export function setActiveSession(sessionToken: string) {
  return authClient.multiSession.setActive({ sessionToken });
}

// 해당 세션만 삭제한다. 나머지 계정의 로그인 상태는 그대로 유지된다.
export function revokeDeviceSession(sessionToken: string) {
  return authClient.multiSession.revoke({ sessionToken });
}
