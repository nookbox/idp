'use client';

import { authClient } from '@/shared/api/auth-client';
import { MenuRowIcon, menuRowClass } from '@/shared/ui/menu-row';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useDeviceSessions } from '../model/use-device-sessions';
import { AccountRow } from './account-row';

export function AccountSwitcher() {
  const { data: session } = authClient.useSession();
  const { sessions, busy, switchingToken, removingToken, switchTo, remove } =
    useDeviceSessions();

  // 현재 계정은 메뉴 위쪽에 이미 크게 보이므로 목록에서 뺀다
  const others = sessions.filter((s) => s.user.id !== session?.user.id);

  return (
    <>
      {others.map((account) => (
        <AccountRow
          key={account.session.token}
          account={account}
          busy={busy}
          switching={switchingToken === account.session.token}
          removing={removingToken === account.session.token}
          onSwitch={() => switchTo(account.session.token)}
          onRemove={() => remove(account.session.token, account.user.name)}
        />
      ))}

      <Link href="/signin" className={menuRowClass}>
        <MenuRowIcon>
          <PlusIcon className="size-5" />
        </MenuRowIcon>
        다른 계정 추가
      </Link>
    </>
  );
}
