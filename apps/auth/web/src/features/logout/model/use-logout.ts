import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { logout } from '../api/logout';

export function useLogout() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const submit = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    const { error } = await logout();

    if (error) {
      setLoggingOut(false);
      toast.error(error.message ?? '로그아웃에 실패했습니다');
      return;
    }

    router.push('/signin');
  };

  return { loggingOut, logout: submit };
}
