import { InvalidTokenNotice } from './invalid-token-notice';
import { ResetPasswordForm } from './reset-password-form';

/**
 * token 은 auth 서버가 메일 링크를 검증한 뒤 이 주소로 붙여 보낸다.
 * 없으면 직접 URL 을 친 것이거나 서버가 error 로 되돌린 경우다.
 */
export function ResetPasswordView({ token }: { token?: string }) {
  return (
    <div className="max-w-md w-full pt-10">
      {token ? <ResetPasswordForm token={token} /> : <InvalidTokenNotice />}
    </div>
  );
}
