'use client';

import { useEffect, useState } from 'react';
import { UAParser } from 'ua-parser-js';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { SectionCard, SectionRow } from './section-card';

type SessionItem = {
  id: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  updatedAt: Date | string;
};

function describeUserAgent(ua?: string | null) {
  if (!ua) return '알 수 없는 기기';
  const { browser, os } = UAParser(ua);
  return [os.name, browser.name].filter(Boolean).join(' · ') || '알 수 없는 기기';
}

export function DevicesSection({
  currentSessionToken,
}: {
  currentSessionToken: string;
}) {
  const [sessions, setSessions] = useState<SessionItem[] | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    authClient.listSessions().then(({ data, error }) => {
      if (error) {
        toast.error(error.message ?? '세션 목록을 불러오지 못했습니다');
        setSessions([]);
        return;
      }
      setSessions(data as SessionItem[]);
    });
  }, []);

  const revoke = async (token: string) => {
    setRevoking(token);
    const { error } = await authClient.revokeSession({ token });
    setRevoking(null);
    if (error) {
      toast.error(error.message ?? '로그아웃에 실패했습니다');
      return;
    }
    setSessions((prev) => prev?.filter((s) => s.token !== token) ?? null);
    toast.success('해당 기기에서 로그아웃되었습니다');
  };

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
                {s.ipAddress || 'IP 알 수 없음'}
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
