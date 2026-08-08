'use client';

import type { User } from '@/entities/user';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/switch';
import { useEditName } from '../model/use-edit-name';
import { useEmailVerification } from '../model/use-email-verification';
import { useMarketingConsent } from '../model/use-marketing-consent';
import { SectionCard, SectionRow } from './section-card';

export function OverviewSection({ user }: { user: User }) {
  const name = useEditName(user.name);
  const email = useEmailVerification(user.email);
  const marketing = useMarketingConsent(user.marketingConsent ?? false);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-5">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name}
            className="size-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-full bg-violet-600 text-3xl font-semibold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-xl font-semibold">{user.name}</p>
          <p className="text-muted-foreground text-sm">{user.email}</p>
        </div>
      </div>

      <SectionCard title="기본 정보">
        <SectionRow
          label="이름"
          description={
            name.editing ? (
              <div className="mt-1 space-y-1">
                <Input
                  {...name.register('name')}
                  onKeyDown={(e) => e.key === 'Enter' && name.submit()}
                  className="h-9 max-w-xs"
                  autoFocus
                />
                {name.errors.name && (
                  <p className="text-destructive text-xs">
                    {name.errors.name.message}
                  </p>
                )}
              </div>
            ) : (
              user.name
            )
          }
        >
          {name.editing ? (
            <div className="flex shrink-0 gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={name.isSubmitting}
                onClick={name.cancel}
              >
                취소
              </Button>
              <Button
                size="sm"
                disabled={name.isSubmitting}
                onClick={name.submit}
              >
                저장
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={name.start}>
              변경하기
            </Button>
          )}
        </SectionRow>

        <SectionRow
          label="이메일"
          description={
            <span className="flex items-center gap-2">
              {user.email}
              {user.emailVerified ? (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                  인증됨
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
                  미인증
                </span>
              )}
            </span>
          }
        >
          {!user.emailVerified && (
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={email.sending || email.cooldown > 0}
                onClick={email.send}
              >
                {email.cooldown > 0
                  ? `재전송 (${email.cooldown}초)`
                  : '인증하기'}
              </Button>
            </div>
          )}
        </SectionRow>
      </SectionCard>

      <SectionCard title="수신 설정">
        <SectionRow
          label="마케팅 정보 수신"
          description="이벤트·혜택 소식을 이메일로 받아요"
        >
          <Switch
            checked={marketing.enabled}
            onCheckedChange={marketing.toggle}
          />
        </SectionRow>
      </SectionCard>
    </div>
  );
}
