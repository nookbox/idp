'use client';

import { UserAvatar } from '@/entities/user';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { Spinner } from '@/shared/ui/spinner';
import { XIcon } from 'lucide-react';
import { useState } from 'react';
import { accountId } from '../lib/account-id';
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
  const [confirming, setConfirming] = useState(false);

  const isAdmin = (user as { role?: string | null }).role === 'admin';

  if (confirming && !removing) {
    return (
      <div className="flex items-center gap-2 py-3 pr-2 pl-4 text-sm">
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">{accountId(user.email)}</span> 계정을
          제거할까요?
        </span>

        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="hover:bg-accent shrink-0 cursor-pointer rounded-md px-3 py-1.5"
        >
          취소
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onRemove}
          className="text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer rounded-md px-3 py-1.5 font-medium disabled:pointer-events-none disabled:opacity-60"
        >
          제거
        </button>
      </div>
    );
  }

  return (
    <div className="group hover:bg-accent flex items-center pr-2 transition-colors">
      <button
        type="button"
        disabled={busy}
        onClick={onSwitch}
        className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left text-sm disabled:pointer-events-none disabled:opacity-60 cursor-pointer"
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
        onClick={() => setConfirming(true)}
        aria-label={`${user.name} 계정 제거`}
        className={cn(
          'text-muted-foreground cursor-pointer  hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none',
          (switching || removing) && 'opacity-100',
        )}
      >
        {switching || removing ? <Spinner /> : <XIcon className="size-4" />}
      </button>
    </div>
  );
}
