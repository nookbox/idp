// 이 서버의 공개 주소. 절대 URL 을 만들 때 쓴다.
export const AUTH_SERVER_URL =
  process.env.BETTER_AUTH_URL ?? 'http://localhost:3001';

export const REQUEST_ID_TOKEN_HEADER = 'x-request-id';

export const FORWARDED_FOR_TOKEN_HEADER = 'x-forwarded-for';

export const VALIDATION_PIPE_OPTIONS = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
};
