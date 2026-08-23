import { AuthLink } from '@/shared/ui/auth-link';

/**
 * 토큰 없이 들어왔거나, auth 서버가 만료·소진된 토큰을 돌려보낸 경우.
 * 이 화면에서는 비밀번호 입력란 자체를 그리지 않는다.
 */
export function InvalidTokenNotice() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight text-balance">
          링크를 쓸 수 없어요
        </h1>
        <h2 className="text-lg/10 font-semibold text-white/70">
          만료되었거나 이미 사용된 링크입니다
        </h2>
      </div>

      <p className="text-sm text-muted-foreground">
        재설정 링크는 한 번만 쓸 수 있고 30분 뒤 만료됩니다. 아래에서 새 링크를
        받아주세요.
      </p>

      <AuthLink
        href="/forgot-password"
        className="flex h-12 w-full items-center justify-center rounded-md bg-violet-600 text-sm font-medium text-white hover:bg-violet-500"
      >
        재설정 링크 다시 받기
      </AuthLink>

      <div className="text-sm text-muted-foreground text-center flex gap-2 justify-center">
        <AuthLink href="/signin" className="underline hover:text-foreground">
          로그인으로 돌아가기
        </AuthLink>
      </div>
    </div>
  );
}
