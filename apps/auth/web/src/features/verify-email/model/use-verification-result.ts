import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const ERROR_MESSAGES: Record<string, string> = {
  'Token expired': '인증 링크가 만료되었습니다. 다시 요청해주세요.',
  'Invalid token': '유효하지 않은 인증 링크입니다. 다시 요청해주세요.',
  'User not found': '계정을 찾을 수 없습니다.',
  'Invalid user':
    '다른 계정으로 로그인되어 있습니다. 로그아웃 후 다시 시도해주세요.',
};

const FALLBACK_ERROR =
  '이메일 인증에 실패했습니다. 링크가 만료되었을 수 있으니 다시 요청해주세요.';

export function useVerificationResult({
  verified,
  error,
}: {
  verified: boolean;
  error?: string;
}) {
  const router = useRouter();

  // 토스트 두번뜨는거 방지
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (!verified && !error) return;
    handled.current = true;

    setTimeout(() => {
      if (error) {
        toast.error(ERROR_MESSAGES[error] ?? FALLBACK_ERROR, {
          duration: 6000,
        });
      } else {
        toast.success('이메일 인증이 완료되었습니다.');
      }
    }, 0);

    // 새로고침하거나 뒤로 왔을 때 토스트가 다시 뜨지 않도록 쿼리를 지움
    router.replace('/');
  }, [verified, error, router]);
}
