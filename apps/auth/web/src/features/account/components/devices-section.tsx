'use client';

import { useEffect, useState } from 'react';
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

// ponytail: 대표 브라우저/OS만 구분하는 최소 파서, 더 정밀하게 필요해지면 ua-parser-js
function describeUserAgent(ua?: string | null) {
  if (!ua) return '알 수 없는 기기';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Safari\//.test(ua)
        ? 'Safari'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : '브라우저';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS X/.test(ua)
      ? 'macOS'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'OS';
  return `${os} · ${browser}`;
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
                  · {new Date(s.updatedAt).toLocaleString('ko-KR')} 활동
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
