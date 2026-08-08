'use client';

import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { describeUserAgent } from '../lib/describe-user-agent';
import { useSessions } from '../model/use-sessions';
import { SectionCard, SectionRow } from './section-card';

export function DevicesSection({
  currentSessionToken,
}: {
  currentSessionToken: string;
}) {
  const { sessions, revoking, revoke } = useSessions();

  if (!sessions) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <SectionCard title="로그인된 기기">
      {sessions.map((s) => {
        const isCurrent = s.token === currentSessionToken;
        return (
          <SectionRow
            key={s.id}
            label={describeUserAgent(s.userAgent)}
            description={
              <span className="flex flex-wrap items-center gap-2">
                {s.ipAddress ? (
                  <Tooltip>
                    <TooltipTrigger className="inline-block max-w-[140px] cursor-default truncate align-bottom">
                      {s.ipAddress}
                    </TooltipTrigger>
                    <TooltipContent>{s.ipAddress}</TooltipContent>
                  </Tooltip>
                ) : (
                  'IP 알 수 없음'
                )}
                <span>
                  ·{' '}
                  {format(new Date(s.updatedAt), 'yyyy.MM.dd a h:mm', {
                    locale: ko,
                  })}{' '}
                  활동
                </span>
                {isCurrent && (
                  <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-400">
                    현재 기기
                  </span>
                )}
              </span>
            }
          >
            {!isCurrent && (
              <Button
                variant="ghost"
                size="sm"
                disabled={revoking === s.token}
                onClick={() => revoke(s.token)}
                className="text-destructive hover:text-destructive shrink-0"
              >
                {revoking === s.token ? '로그아웃 중...' : '로그아웃'}
              </Button>
            )}
          </SectionRow>
        );
      })}
    </SectionCard>
  );
}
