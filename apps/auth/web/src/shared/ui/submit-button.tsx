import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';

interface Props extends React.ComponentProps<typeof Button> {
  loading: boolean;
  /** 로딩 중 글자를 바꾸고 싶을 때 (기본: children 그대로) */
  loadingText?: string;
  /** 로딩 중엔 글자 없이 스피너만 보여준다 */
  spinnerOnly?: boolean;
}

export function SubmitButton({
  loading,
  loadingText,
  spinnerOnly = false,
  children,
  className,
  ...props
}: Props) {
  return (
    <Button
      type="submit"
      disabled={loading}
      className={cn(
        'h-12 w-full bg-violet-600 text-white hover:bg-violet-700 rounded',
        className,
      )}
      {...props}
    >
      {!loading ? (
        children
      ) : spinnerOnly ? (
        <>
          <Spinner />
          {/* 눈에는 안 보이고 화면 읽기 프로그램만 읽음 */}
          <span className="sr-only">{loadingText ?? children}</span>
        </>
      ) : (
        <>
          {loadingText ?? children} <Spinner />
        </>
      )}
    </Button>
  );
}
