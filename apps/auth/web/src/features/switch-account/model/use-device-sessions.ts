import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  listDeviceSessions,
  revokeDeviceSession,
  setActiveSession,
} from '../api/device-sessions';
import { accountId } from '../lib/account-id';
import type { DeviceSession } from './types';

export function useDeviceSessions() {
  const router = useRouter();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingToken, setSwitchingToken] = useState<string | null>(null);
  const [removingToken, setRemovingToken] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    listDeviceSessions().then(({ data }) => {
      if (!alive) return;
      // 목록은 부가 정보라 실패해도 조용히 빈 목록으로 둔다
      setSessions(data ?? []);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, []);

  const busy = switchingToken !== null || removingToken !== null;

  const switchTo = async (sessionToken: string) => {
    if (busy) return;
    setSwitchingToken(sessionToken);

    const { error } = await setActiveSession(sessionToken);

    if (error) {
      setSwitchingToken(null);
      toast.error(error.message ?? '계정 전환에 실패했습니다');
      return;
    }

    router.refresh();
  };

  const remove = async (sessionToken: string, email: string) => {
    if (busy) return;
    setRemovingToken(sessionToken);

    const { error } = await revokeDeviceSession(sessionToken);
    setRemovingToken(null);

    if (error) {
      toast.error(error.message ?? '계정 제거에 실패했습니다');
      return;
    }

    setSessions((prev) => prev.filter((s) => s.session.token !== sessionToken));
    toast.success(`${accountId(email)} 계정을 목록에서 제거했습니다`);
  };

  return {
    sessions,
    loading,
    busy,
    switchingToken,
    removingToken,
    switchTo,
    remove,
  };
}
