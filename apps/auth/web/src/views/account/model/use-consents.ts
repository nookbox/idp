import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { deleteConsent, fetchConsents, type Consent } from '../api/consents';

export function useConsents() {
  const [consents, setConsents] = useState<Consent[] | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchConsents().then(({ data, error }) => {
      if (error) {
        toast.error('연결된 서비스 목록을 불러오지 못했습니다');
        setConsents([]);
        return;
      }
      setConsents(data ?? []);
    });
  }, []);

  const revoke = async (id: string) => {
    setRevoking(id);
    const { error } = await deleteConsent(id);
    setRevoking(null);

    if (error) {
      toast.error('연결 해제에 실패했습니다');
      return;
    }
    setConsents((prev) => prev?.filter((c) => c.id !== id) ?? null);
    toast.success('서비스 연결이 해제되었습니다');
  };

  return { consents, revoking, revoke };
}
