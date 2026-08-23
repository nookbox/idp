export const FORGOT_PASSWORD_FALLBACK_ERROR =
  '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요';

/** 재발송 대기 시간(초). 서버 레이트리밋(5분/3회)보다 먼저 사용자를 막아준다. */
export const RESEND_COOLDOWN_SECONDS = 60;
