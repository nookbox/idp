export const SAVED_EMAIL_KEY = 'auth:saved-email';

export const SIGNIN_FALLBACK_ERROR =
  '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.';

/**
 * 로그인 화면에서만 다르게 안내할 문구.
 * 화면 고유 문구가 생기면 code 를 키로 추가한다.
 */
export const SIGNIN_ERROR_MESSAGES: Record<string, string> = {};
