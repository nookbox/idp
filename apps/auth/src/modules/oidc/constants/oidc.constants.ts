/** authorization code 유효 시간 (초) */
export const CODE_TTL_SECONDS = 300;

/** refresh token 유효 시간 (초). 7일 */
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

/** 동의 화면 URL(서명) 유효 시간 (초). 이 안에 [허용]/[거부] 를 눌러야 함 */
export const CONSENT_URL_TTL_SECONDS = 600;
