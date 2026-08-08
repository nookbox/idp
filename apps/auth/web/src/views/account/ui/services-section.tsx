'use client';

import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';
import { useConsents } from '../model/use-consents';
import { SectionCard, SectionRow } from './section-card';

export function ServicesSection() {
  const { consents, revoking, revoke } = useConsents();

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
