import AuthLink from '@/components/link/auth-link';
import { SigninForm } from './components/signin-form';

export default function SignInPage() {
  return (
    <div className="max-w-md w-full pt-10">
      <div className="pb-2">
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight text-balance ">
          로그인 정보를 입력하세요
        </h1>
        <h2 className="text-lg/10 font-semibold text-white/70 ">
          아니면 새 계정으로 시작하세요
        </h2>
      </div>

      <SigninForm />

      <div className="text-sm text-muted-foreground text-center mt-4 flex gap-2 justify-center">
        계정이 없으신가요?
        <AuthLink href="/signup" className="underline hover:text-foreground">
          가입하기
        </AuthLink>
      </div>
    </div>
  );
}
