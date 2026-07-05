import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface Props extends React.ComponentProps<typeof Button> {
  loading: boolean;
  loadingText?: string;
}

export function SubmitButton({
  loading,
  loadingText,
  children,
  className,
  ...props
}: Props) {
  return (
    <Button
      type="submit"
      disabled={loading}
      className={cn(
        'h-12 w-full bg-violet-600 text-white hover:bg-violet-500',
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          {loadingText ?? children} <Spinner />
        </>
      ) : (
        children
      )}
    </Button>
  );
}
