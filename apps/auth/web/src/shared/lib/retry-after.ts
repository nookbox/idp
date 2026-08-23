/**
 * 429 응답의 `X-Retry-After`(초)를 읽는다.
 *
 * better-auth 의 레이트리밋이 붙여주는 헤더로, 그 경로를 다시 부를 수 있을 때까지
 * 남은 시간이다. 클라이언트가 세던 쿨다운과 어긋났을 때는 이쪽이 정답이므로,
 * 값이 잡히면 화면 쿨다운을 이걸로 맞춘다.
 *
 * 429 가 아니면 헤더 자체가 없다. null 을 돌려 "서버가 알려준 값 없음"을 구분한다.
 */
export function readRetryAfter(response: Response | undefined): number | null {
  if (!response || response.status !== 429) return null;

  const seconds = Number(response.headers.get('X-Retry-After'));
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;
}
