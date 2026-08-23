import { ResetPasswordView } from '@/views/reset-password';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  // 서버가 토큰 검증에 실패하면 token 없이 ?error=INVALID_TOKEN 으로 돌려보낸다.
  return <ResetPasswordView token={error ? undefined : token} />;
}
