// 이 서버의 공개 주소. 절대 URL 을 만들 때 쓴다.
export const AUTH_SERVER_URL =
  process.env.BETTER_AUTH_URL ?? 'http://localhost:3001';

export const REQUEST_ID_TOKEN_HEADER = 'x-request-id';

/**
 * Cloudflare 가 붙이는 진짜 클라이언트 IP.
 *
 * ⚠️ x-forwarded-for 를 쓰면 안 된다. 클라이언트가 직접 넣어 보낸 값이 있으면
 *    Cloudflare 는 지우지 않고 뒤에 실제 IP 를 덧붙인다("위조IP, 진짜IP").
 *    즉 왼쪽 값은 아무나 지어낼 수 있어서, IP 기준 제한을 그 값으로 걸면
 *    공격자가 헤더만 바꿔가며 무한히 우회한다.
 *
 *    cf-connecting-ip 는 Cloudflare 가 항상 단일 값으로 덮어쓰기 때문에
 *    터널을 거쳐 들어오는 한 위조가 불가능하다.
 *
 * ⚠️ 이 서버는 반드시 Cloudflare 뒤에만 두어야 한다. 오리진 포트를 외부에
 *    직접 열면 이 헤더도 클라이언트가 지어낼 수 있다. 지금은 컨테이너 포트가
 *    127.0.0.1 에만 묶여 있어(docker-compose.prod.yml) 그 조건이 지켜진다.
 */
export const CF_CONNECTING_IP_HEADER = 'cf-connecting-ip';

export const VALIDATION_PIPE_OPTIONS = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
};
