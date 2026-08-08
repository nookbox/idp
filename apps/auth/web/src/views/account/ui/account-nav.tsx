import { LogoutBtn } from '@/features/logout';
import { cn } from '@/shared/lib/utils';
import { Separator } from '@/shared/ui/separator';
import { SECTIONS } from '../model/constants';
import type { SectionKey } from '../model/types';

interface Props {
  section: SectionKey;
  onSectionChange: (section: SectionKey) => void;
}

export function AccountNav({ section, onSectionChange }: Props) {
  return (
    <nav className="flex md:flex-col">
      {SECTIONS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          aria-current={section === key ? 'page' : undefined}
          onClick={() => onSectionChange(key)}
          className={cn(
            'flex items-center gap-2 rounded-lg px-2 md:px-4 py-2.5 text-sm whitespace-nowrap transition-colors cursor-pointer',
            section === key
              ? 'bg-accent font-semibold'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}

      <div className="hidden md:block">
        <Separator className="my-2" />
        <LogoutBtn />
      </div>
    </nav>
  );
}
