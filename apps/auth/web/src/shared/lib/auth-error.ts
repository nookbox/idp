export type AuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
  statusText?: string;
};

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // 자격 증명
  INVALID_EMAIL_OR_PASSWORD: '이메일 또는 비밀번호가 올바르지 않습니다',
  INVALID_EMAIL: '올바른 이메일 형식이 아닙니다',
  INVALID_PASSWORD: '비밀번호가 올바르지 않습니다',
  USER_NOT_FOUND: '이메일 또는 비밀번호가 올바르지 않습니다',
  CREDENTIAL_ACCOUNT_NOT_FOUND:
    '비밀번호로 로그인할 수 없는 계정입니다. 소셜 로그인을 이용해주세요',

  // 가입
  USER_ALREADY_EXISTS: '이미 가입된 이메일입니다',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: '이미 가입된 이메일입니다',
  FAILED_TO_CREATE_USER: '가입 처리 중 오류가 발생했습니다',
  PASSWORD_TOO_SHORT: '비밀번호가 너무 짧습니다',
  PASSWORD_TOO_LONG: '비밀번호가 너무 깁니다',
  PASSWORD_ALREADY_SET: '이미 비밀번호가 설정된 계정입니다',
  USER_ALREADY_HAS_PASSWORD: '이미 비밀번호가 설정된 계정입니다',

  // 이메일 인증
  EMAIL_NOT_VERIFIED: '이메일 인증이 완료되지 않았습니다',
  EMAIL_ALREADY_VERIFIED: '이미 인증이 완료된 이메일입니다',
  VERIFICATION_EMAIL_NOT_ENABLED: '이메일 인증을 사용할 수 없습니다',
  EMAIL_MISMATCH: '이메일이 일치하지 않습니다',
  EMAIL_CAN_NOT_BE_UPDATED: '이메일은 변경할 수 없습니다',
  CHANGE_EMAIL_DISABLED: '이메일 변경 기능이 비활성화되어 있습니다',

  // 세션 / 토큰
  SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요',
  SESSION_NOT_FRESH: '보안을 위해 다시 로그인한 뒤 시도해주세요',
  FAILED_TO_CREATE_SESSION:
    '로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요',
  FAILED_TO_GET_SESSION: '세션 정보를 불러오지 못했습니다',
  INVALID_TOKEN: '유효하지 않은 요청입니다. 링크를 다시 확인해주세요',
  TOKEN_EXPIRED: '유효기간이 만료되었습니다. 다시 시도해주세요',

  // 계정 연결
  ACCOUNT_NOT_FOUND: '연결된 계정을 찾을 수 없습니다',
  SOCIAL_ACCOUNT_ALREADY_LINKED: '이미 다른 계정에 연결된 소셜 계정입니다',
  LINKED_ACCOUNT_ALREADY_EXISTS: '이미 연결된 계정입니다',
  FAILED_TO_UNLINK_LAST_ACCOUNT: '마지막 로그인 수단은 연결 해제할 수 없습니다',
  PROVIDER_NOT_FOUND: '지원하지 않는 로그인 제공자입니다',

  // 요청 검증
  VALIDATION_ERROR: '입력값을 다시 확인해주세요',
  MISSING_FIELD: '필수 입력값이 비어 있습니다',
  FIELD_NOT_ALLOWED: '허용되지 않은 입력값입니다',
  CROSS_SITE_NAVIGATION_LOGIN_BLOCKED:
    '보안상 차단된 요청입니다. 처음부터 다시 시도해주세요',
};

/**
 * code 가 비어 있을 때 영문 message 로부터 code 를 복원한다.
 * better-auth 는 BASE_ERROR_CODES 의 문구를 대문자 스네이크로 바꿔 code 로 쓴다.
 * ("User already exists. Use another email." -> USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL)
 */
function deriveCode(message: string): string {
  return message
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase();
}

export function getAuthErrorCode(
  error: AuthErrorLike | null | undefined,
): string | undefined {
  if (!error) return undefined;
  if (error.code) return error.code;
  if (error.message) return deriveCode(error.message);
  return undefined;
}

/**
 * @param fallback 매핑되지 않은 에러에 쓸 화면별 기본 문구
 * @param overrides 이 화면에서만 다르게 보여줄 code -> 문구
 */
export function getAuthErrorMessage(
  error: AuthErrorLike | null | undefined,
  fallback: string,
  overrides?: Record<string, string>,
): string {
  const code = getAuthErrorCode(error);
  if (!code) return fallback;

  const message = overrides?.[code] ?? AUTH_ERROR_MESSAGES[code];
  if (message) return message;

  // 영문 원문을 그대로 토스트에 띄우지 않는다. 대신 개발 중에만 누락을 알린다.
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[auth-error] 매핑되지 않은 코드: ${code}`, error);
  }
  return fallback;
}
