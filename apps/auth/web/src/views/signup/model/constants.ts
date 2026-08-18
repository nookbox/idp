export const SIGNUP_FALLBACK_ERROR =
  '가입에 실패했습니다. 잠시 후 다시 시도해주세요';

/** 가입 화면에서만 다르게 안내할 문구 (@/shared/lib/auth-error 의 기본값을 덮어쓴다) */
export const SIGNUP_ERROR_MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS: '이미 가입된 이메일이에요. 로그인해주세요',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    '이미 가입된 이메일이에요. 로그인해주세요',
};
