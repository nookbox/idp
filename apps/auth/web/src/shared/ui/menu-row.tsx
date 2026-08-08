import { cn } from '@/shared/lib/utils';

export const menuRowClass =
  'flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-60 cursor-pointer';

function MenuRowIcon({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="menu-row-icon"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center',
        className,
      )}
      {...props}
    />
  );
}

export { MenuRowIcon };
