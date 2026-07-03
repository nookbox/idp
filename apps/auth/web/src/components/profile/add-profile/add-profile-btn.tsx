'use client';

import { CirclePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOpenAddProfile } from '../context/profile-gate-context';

export function AddProfileBtn() {
  const openAddProfile = useOpenAddProfile();

  return (
    <li className="profile-tile ">
      <Button
        variant="ghost"
        onClick={openAddProfile}
        className="text-muted-foreground hover:text-foreground flex h-full flex-col items-center justify-around gap-2 hover:bg-transparent w-full "
      >
        <CirclePlus className="size-[clamp(50px,5vw,64px)]" />
        <span>프로필 추가</span>
      </Button>
    </li>
  );
}
