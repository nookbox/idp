import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import type { User } from '../model/types';

interface Props {
  user: Pick<User, 'name' | 'image'>;
  className?: string;
}

export function UserAvatar({ user, className }: Props) {
  return (
    <Avatar className={className}>
      {user.image && <AvatarImage src={user.image} alt={user.name} />}
      <AvatarFallback className="bg-violet-600 font-semibold text-white">
        {user.name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
