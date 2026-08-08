'use client';

import { UserAvatar } from '@/entities/user';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { Spinner } from '@/shared/ui/spinner';
import { XIcon } from 'lucide-react';
import type { DeviceSession } from '../model/types';

interface Props {
  account: DeviceSession;
  busy: boolean;
  switching: boolean;
  removing: boolean;
  onSwitch: () => void;
  onRemove: () => void;
}

export function AccountRow({
  account: { user },
  busy,
  switching,
  removing,
  onSwitch,
  onRemove,
}: Props) {
  // admin 플러그인이 user 에 얹어주는 필드라 클라이언트 타입에는 없다
  const isAdmin = (user as { role?: string | null }).role === 'admin';

  return (
    <div className="group hover:bg-accent flex items-center pr-2 transition-colors">
      <button
        type="button"
        disabled={busy}
        onClick={onSwitch}
        className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left text-sm disabled:pointer-events-none disabled:opacity-60"
      >
        <UserAvatar
          user={user}
          className="size-8 shrink-0"
          fullbackClassname="text-xs"
        />
        <span className="truncate">{user.name}</span>

        {isAdmin && (
          <Badge className="ml-auto shrink-0 rounded-sm bg-blue-600 text-white">
            관리자
          </Badge>
        )}
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={onRemove}
        aria-label={`${user.name} 계정 제거`}
        className={cn(
          'text-muted-foreground hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none',
          // 전환·제거 중에는 hover 여부와 무관하게 스피너가 보여야 한다
          (switching || removing) && 'opacity-100',
        )}
      >
        {switching || removing ? <Spinner /> : <XIcon className="size-4" />}
      </button>
    </div>
  );
}
