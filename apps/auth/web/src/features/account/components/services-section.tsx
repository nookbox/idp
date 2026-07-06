'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { SectionCard, SectionRow } from './section-card';

type Consent = {
  id: string;
  clientId: string;
  scopes: string[];
  createdAt?: string | null;
};

export function ServicesSection() {
  const [consents, setConsents] = useState<Consent[] | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    authClient
      .$fetch('/oauth2/get-consents')
      .then(({ data, error }) => {
        if (error) throw error;
        setConsents(data as Consent[]);
      })
      .catch(() => {
        toast.error('연결된 서비스 목록을 불러오지 못했습니다');
        setConsents([]);
      });
  }, []);

  const revoke = async (id: string) => {
    setRevoking(id);
    const { error } = await authClient.$fetch('/oauth2/delete-consent', {
      method: 'POST',
      body: { id },
    });
    setRevoking(null);
    if (error) {
      toast.error('연결 해제에 실패했습니다');
      return;
    }
    setConsents((prev) => prev?.filter((c) => c.id !== id) ?? null);
    toast.success('서비스 연결이 해제되었습니다');
  };

  if (!consents) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (consents.length === 0) {
    return (
      <SectionCard title="연결된 서비스">
        <p className="text-muted-foreground px-5 py-8 text-center text-sm">
          아직 연결된 서비스가 없습니다
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="연결된 서비스">
      {consents.map((c) => (
        <SectionRow
          key={c.id}
          label={c.clientId}
          description={`허용 권한: ${c.scopes.join(', ')}`}
        >
          <Button
            variant="ghost"
            size="sm"
            disabled={revoking === c.id}
            onClick={() => revoke(c.id)}
            className="text-destructive hover:text-destructive shrink-0"
          >
            {revoking === c.id ? '해제 중...' : '연결 해제'}
          </Button>
        </SectionRow>
      ))}
    </SectionCard>
  );
}
