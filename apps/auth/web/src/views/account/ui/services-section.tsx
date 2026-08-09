'use client';

import { SERVICE_URL } from '@/shared/config/service';
import { Button } from '@/shared/ui/button';
import { ExternalLink } from '@/shared/ui/external-link';
import { Spinner } from '@/shared/ui/spinner';
import { Blocks } from 'lucide-react';
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
        <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
          <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
            <Blocks className="size-6" />
          </span>

          <div className="space-y-1.5">
            <p className="text-base font-semibold">
              아직 연결된 서비스가 없어요
            </p>

            <p className="text-muted-foreground max-w-xs text-sm leading-relaxed text-balance break-keep">
              NOOKBOX에 이 계정으로 로그인하면, 제공한 정보를 여기에서 확인하고
              언제든 연결을 해제할 수 있어요.
            </p>
          </div>

          <Button variant="outline" size="sm" className="mt-1" asChild>
            <ExternalLink href={SERVICE_URL}>NOOKBOX 둘러보기</ExternalLink>
          </Button>
        </div>
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
