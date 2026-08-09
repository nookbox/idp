'use client';

import { Spinner } from '@/shared/ui/spinner';
import { LogOut } from 'lucide-react';
import { useLogout } from '../model/use-logout';

export function LogoutBtn() {
  const { loggingOut, logout } = useLogout('current');

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loggingOut}
      className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2.5 text-sm whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-60 md:px-4"
    >
      {loggingOut ? <Spinner /> : <LogOut className="size-4" />}
      로그아웃
    </button>
  );
}
