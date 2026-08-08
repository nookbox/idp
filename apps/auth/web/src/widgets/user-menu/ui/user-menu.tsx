'use client';

import { UserAvatar } from '@/entities/user';
import { useLogout } from '@/features/logout';
import { AccountSwitcher } from '@/features/switch-account';
import { UploadAvatar } from '@/features/upload-avatar';
import { authClient } from '@/shared/api/auth-client';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { MenuRowIcon, menuRowClass } from '@/shared/ui/menu-row';
import { ChevronUpIcon, LogOutIcon, X } from 'lucide-react';
import { useState } from 'react';

const TOGGLE_MOTION = 'duration-200 ease-out';

export function UserMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);

  const { data: session } = authClient.useSession();
  const { loggingOut, logout } = useLogout();

  if (!session) return null;

  const { email } = session.user;

  return (
    <DropdownMenu open={true} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <UserAvatar user={session.user} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-svw h-screen  md:w-109 px-4  "
      >
        <DropdownMenuLabel className="grid grid-cols-[--spacing(10)_1fr_--spacing(10)] items-center font-normal">
          <span />

          <p className="text-center text-sm text-neutral-200">{email}</p>

          <Button
            variant="ghost"
            aria-label="메뉴 닫기"
            title="닫기"
            onClick={() => setMenuOpen(false)}
            className="hover:bg-foreground/10! size-10 rounded-full"
          >
            <X className="size-5" />
          </Button>
        </DropdownMenuLabel>

        <div className="flex justify-center items-center flex-col gap-2 py-2">
          <UploadAvatar
            user={session.user}
            className="size-20"
            fullbackClassname="text-3xl"
          />

          <div className="text-2xl font-normal">
            안녕하세요, {session.user.name}님
          </div>
        </div>

        <Collapsible
          open={accountsOpen}
          onOpenChange={setAccountsOpen}
          className="bg-muted/40 divide-border mt-1 divide-y overflow-hidden rounded-xl border my-2"
        >
          <CollapsibleTrigger className="hover:bg-accent flex w-full items-center justify-between px-4 py-3 text-sm transition-colors cursor-pointer">
            <span className="flex items-center">
              계정 더보기
              <span
                className={cn(
                  'whitespace-nowrap transition-opacity',
                  TOGGLE_MOTION,
                  accountsOpen ? 'opacity-100' : 'opacity-0',
                )}
              >
                &nbsp;숨기기
              </span>
            </span>

            <ChevronUpIcon
              className={cn(
                'text-muted-foreground size-4 transition-transform',
                TOGGLE_MOTION,
                !accountsOpen && 'rotate-180',
              )}
            />
          </CollapsibleTrigger>

          <CollapsibleContent
            className={cn(
              'divide-border divide-y overflow-hidden',
              'data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
              TOGGLE_MOTION,
            )}
          >
            <AccountSwitcher />

            <button
              type="button"
              disabled={loggingOut}
              onClick={logout}
              className={menuRowClass}
            >
              <MenuRowIcon>
                <LogOutIcon className="size-5" />
              </MenuRowIcon>
              모든 계정에서 로그아웃
            </button>
          </CollapsibleContent>
        </Collapsible>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
