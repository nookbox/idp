import { authClient } from '@/shared/api/auth-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { logoutAll, logoutCurrent } from '../api/logout';

// 'current' 는 이 계정만, 'all' 은 이 브라우저의 모든 계정을 로그아웃한다
type LogoutScope = 'current' | 'all';

export function useLogout(scope: LogoutScope) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  const submit = async () => {
    if (loggingOut || !session) return;

    setLoggingOut(true);

    let { error } =
      scope === 'current'
        ? await logoutCurrent(session.session.token)
        : await logoutAll();

    if (error && scope === 'current') {
      ({ error } = await logoutAll());
    }

    if (error) {
      setLoggingOut(false);
      toast.error(error.message ?? '로그아웃에 실패했습니다');
      return;
    }

    //  헤더가 방금 로그아웃한 계정을 계속 들고 있는것을 방지하는 차원에서.
    authClient.$store.notify('$sessionSignal');

    if (scope === 'all') {
      router.push('/signin');
      return;
    }

    router.refresh();
    setLoggingOut(false);
  };

  return { loggingOut, logout: submit };
}
