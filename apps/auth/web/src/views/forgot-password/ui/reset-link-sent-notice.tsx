'use client';

import { AuthLink } from '@/shared/ui/auth-link';
import { Button } from '@/shared/ui/button';

interface Props {
  email: string;
  cooldown: number;
  onResend: () => void;
}

/**
 * 발송 후 화면.
 */
export function ResetLinkSentNotice({ email, cooldown, onResend }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight text-balance">
          메일을 확인해주세요
        </h1>
        <h2 className="text-lg/10 font-semibold text-white/70">
          가입된 주소라면 재설정 링크가 도착합니다
        </h2>
      </div>

      <div className="rounded-lg border border-neutral-700 px-4 py-3 text-sm">
        <p className="text-white/90 break-all">{email}</p>
        <p className="text-muted-foreground mt-1">
          메일이 보이지 않으면 스팸함도 확인해 주세요.
        </p>
      </div>

      <Button
        variant="outline"
        className="h-12 w-full"
        disabled={cooldown > 0}
        onClick={onResend}
      >
        {cooldown > 0 ? `재전송 (${cooldown}초)` : '메일 다시 보내기'}
      </Button>

      <div className="text-sm text-muted-foreground text-center flex gap-2 justify-center">
        <AuthLink href="/signin" className="underline hover:text-foreground">
          로그인으로 돌아가기
        </AuthLink>
      </div>
    </div>
  );
}
