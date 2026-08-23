export const RESET_PASSWORD_FALLBACK_ERROR =
  '비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해주세요';

/** 재설정 화면에서만 다르게 안내할 문구 (@/shared/lib/auth-error 의 기본값을 덮어쓴다) */
export const RESET_PASSWORD_ERROR_MESSAGES: Record<string, string> = {
  INVALID_TOKEN:
    '링크가 만료되었거나 이미 사용되었습니다. 재설정을 다시 요청해주세요',
};

/**
 * auth 서버가 토큰 검증에 실패하면 재설정 화면으로 되돌리며 붙이는 쿼리값.
 * (better-auth 의 /reset-password/:token 콜백)
 */
export const INVALID_TOKEN_ERROR = 'INVALID_TOKEN';
