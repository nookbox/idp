import { cn } from '@/lib/utils';

export function SectionCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className="space-y-3">
      {title && (
        <h2 className="text-muted-foreground text-sm font-medium">{title}</h2>
      )}
      <div
        className={cn(
          'divide-border bg-card divide-y rounded-xl border',
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function SectionRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <div className="text-muted-foreground text-sm break-all">
            {description}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
