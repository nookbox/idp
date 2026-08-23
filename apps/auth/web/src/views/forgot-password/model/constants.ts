export const FORGOT_PASSWORD_FALLBACK_ERROR =
  '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요';

/** 재발송 대기 시간(초). 서버가 429 를 주면 그 값으로 덮어쓴다. */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * 쿨다운 만료 시각을 담는 localStorage 키.
 * 계정 화면의 이메일 인증 재발송과 반드시 달라야 한다. 같이 쓰면 한쪽에서
 * 보낸 쿨다운이 다른 쪽 버튼까지 잠근다.
 */
export const FORGOT_PASSWORD_COOLDOWN_KEY =
  'auth:password-reset-cooldown-until';
