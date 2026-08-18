'use client';

import { UserAvatar, type User } from '@/entities/user';
import { cn } from '@/shared/lib/utils';
import { Camera } from 'lucide-react';
import type { UploadAvatarController } from '../model/types';

interface Props {
  user: Pick<User, 'name' | 'image'>;
  upload: UploadAvatarController;
  className?: string;
  fullbackClassname?: string;
}

export function AvatarUploadTrigger({
  user,
  upload,
  className,
  fullbackClassname,
}: Props) {
  const { openFilePicker } = upload;

  return (
    <button
      type="button"
      onClick={openFilePicker}
      aria-label="프로필 사진 변경"
      className="group relative inline-block cursor-pointer"
    >
      <UserAvatar
        user={user}
        className={className}
        fullbackClassname={fullbackClassname}
      />

      <span
        className={cn(
          'absolute right-0 bottom-0 rounded-full p-1.5',
          'transition-all group-hover:text-blue-100',
        )}
      >
        <Camera className="size-4" />
      </span>
    </button>
  );
}
