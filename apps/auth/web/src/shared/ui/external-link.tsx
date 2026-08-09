import { cn } from '@/shared/lib/utils';
import { ArrowUpRight } from 'lucide-react';

interface Props extends React.ComponentProps<'a'> {
  showIcon?: boolean;
}

export function ExternalLink({
  className,
  children,
  showIcon = true,
  ...props
}: Props) {
  return (
    <a
      target="_blank"
      rel="noopener"
      className={cn('inline-flex items-center gap-1', className)}
      {...props}
    >
      {children}
      {showIcon && <ArrowUpRight className="size-4 shrink-0" />}
    </a>
  );
}
