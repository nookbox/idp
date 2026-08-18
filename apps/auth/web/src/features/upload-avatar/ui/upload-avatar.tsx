'use client';

import { type User } from '@/entities/user';
import { useUploadAvatar } from '../model/use-upload-avatar';
import { AvatarEditorDialog } from './avatar-editor-dialog';
import { AvatarUploadTrigger } from './avatar-upload-trigger';

interface Props {
  user: Pick<User, 'name' | 'image'>;
  className?: string;
  fullbackClassname?: string;
}

export function UploadAvatar({ user, className, fullbackClassname }: Props) {
  const upload = useUploadAvatar();

  return (
    <>
      <AvatarUploadTrigger
        user={user}
        upload={upload}
        className={className}
        fullbackClassname={fullbackClassname}
      />
      <AvatarEditorDialog upload={upload} />
    </>
  );
}
