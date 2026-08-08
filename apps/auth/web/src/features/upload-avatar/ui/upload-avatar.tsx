import { UserAvatar, type User } from '@/entities/user';
import { cn } from '@/shared/lib/utils';
import { Camera } from 'lucide-react';

interface Props {
  user: Pick<User, 'name' | 'image'>;
  className?: string;
  fullbackClassname?: string;
}

export function UploadAvatar({ user, className, fullbackClassname }: Props) {
  return (
    <div className="group relative inline-block cursor-pointer">
      <UserAvatar
        user={user}
        className={className}
        fullbackClassname={fullbackClassname}
      />

      <div
        className={cn(
          'absolute right-0 bottom-0 rounded-full p-1.5',
          'transition-all group-hover:text-blue-100',
        )}
      >
        <Camera className="size-4" />
      </div>
    </div>
  );
}
