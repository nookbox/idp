'use client';

import { UserAvatar } from '@/entities/user';
import { useLogout } from '@/features/logout';
import { UploadAvatar } from '@/features/upload-avatar';
import { authClient } from '@/shared/api/auth-client';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { LogOutIcon, UserIcon } from 'lucide-react';
import Link from 'next/link';

export function UserMenu() {
  const { data: session } = authClient.useSession();
  const { logout } = useLogout();

  if (!session) return null;

  const { email } = session.user;

  return (
    <DropdownMenu open modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <UserAvatar user={session.user} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[436px]">
        <DropdownMenuLabel className="font-normal">
          <p className="text-gray-100 text-center text-xs">{email}</p>
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

        <DropdownMenuItem asChild>
          <Link href="/">
            <UserIcon />
            계정 관리
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={logout}>
          <LogOutIcon />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
