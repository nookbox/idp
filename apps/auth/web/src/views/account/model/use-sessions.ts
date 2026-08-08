import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  fetchSessions,
  revokeSession,
  type SessionItem,
} from '../api/sessions';

export function useSessions() {
  const [sessions, setSessions] = useState<SessionItem[] | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions().then(({ data, error }) => {
      if (error) {
        toast.error(error.message ?? '세션 목록을 불러오지 못했습니다');
        setSessions([]);
        return;
      }
      setSessions(data ?? []);
    });
  }, []);

  const revoke = async (token: string) => {
    setRevoking(token);
    const { error } = await revokeSession(token);
    setRevoking(null);

    if (error) {
      toast.error(error.message ?? '로그아웃에 실패했습니다');
      return;
    }
    setSessions((prev) => prev?.filter((s) => s.token !== token) ?? null);
    toast.success('해당 기기에서 로그아웃되었습니다');
  };

  return { sessions, revoking, revoke };
}
