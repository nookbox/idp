import { authClient } from '@/shared/api/auth-client';
import { readRetryAfter } from '@/shared/lib/retry-after';

/**
 * 재설정 링크 발송을 요청한다.
 *
 * 가입 여부와 무관하게 항상 성공을 돌려준다(계정 열거 방지). 화면도 그에 맞춰
 * "메일을 보냈다"는 안내만 하고, 그 주소가 가입돼 있는지는 알려주지 않는다.
 *
 * redirectTo 는 서버가 토큰을 확인한 뒤 사용자를 돌려보낼 주소다.
 * auth 서버의 trustedOrigins 안에 있어야 통과한다.
 */
export async function requestPasswordReset(email: string) {
  // onError 는 콜백이라 TS 가 대입을 흐름 분석에 못 넣는다. 응답만 담아두고
  // 헤더 해석은 await 이 끝난 뒤에 한다.
  const failure: { response?: Response } = {};

  const { error } = await authClient.requestPasswordReset(
    {
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    },
    {
      onError: (ctx) => {
        failure.response = ctx.response;
      },
    },
  );

  return { error, retryAfter: readRetryAfter(failure.response) };
}
