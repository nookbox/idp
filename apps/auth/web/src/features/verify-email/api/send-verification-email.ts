import { authClient } from '@/shared/api/auth-client';
import { readRetryAfter } from '@/shared/lib/retry-after';

export async function sendVerificationEmail(email: string) {
  // onError 는 콜백이라 TS 가 대입을 흐름 분석에 못 넣는다. 응답만 담아두고
  // 헤더 해석은 await 이 끝난 뒤에 한다.
  const failure: { response?: Response } = {};

  const { error } = await authClient.sendVerificationEmail(
    {
      email,
      // 링크를 누르면 인증 처리 후 이 주소로 되돌아온다.
      callbackURL: `${window.location.origin}/?verified=1`,
    },
    {
      onError: (ctx) => {
        failure.response = ctx.response;
      },
    },
  );

  return { error, retryAfter: readRetryAfter(failure.response) };
}
