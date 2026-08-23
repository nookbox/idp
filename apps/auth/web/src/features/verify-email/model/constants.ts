/** 재발송 대기 시간(초). 서버가 429 를 주면 그 값으로 덮어쓴다. */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * 쿨다운 만료 시각을 담는 localStorage 키.
 * 재설정 요청 화면(/forgot-password)과 반드시 달라야 한다. 같이 쓰면 한쪽에서
 * 보낸 쿨다운이 다른 쪽 버튼까지 잠근다.
 */
export const VERIFY_EMAIL_COOLDOWN_KEY = 'auth:verify-email-cooldown-until';

export const VERIFY_EMAIL_FALLBACK_ERROR = '이메일 전송에 실패했습니다';
