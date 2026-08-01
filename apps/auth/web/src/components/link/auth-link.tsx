'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';

type AuthLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

// useSearchParams는 클라이언트에서만 값이 확정되므로, 프로덕션 빌드의 정적 프리렌더
// 단계에서는 위쪽에 Suspense 경계가 반드시 있어야 한다. 없으면 next build가 실패한다.
function AuthLinkWithParams({ href, className, children }: AuthLinkProps) {
  const qs = useSearchParams().toString();

  return (
    <Link href={qs ? `${href}?${qs}` : href} className={className}>
      {children}
    </Link>
  );
}

export default function AuthLink({ href, className, children }: AuthLinkProps) {
  return (
    <Suspense
      // 프리렌더 시점엔 쿼리스트링을 알 수 없다. 쿼리 없는 링크를 먼저 그리고
      // 하이드레이션 후 쿼리가 붙은 링크로 교체된다.
      fallback={
        <Link href={href} className={className}>
          {children}
        </Link>
      }
    >
      <AuthLinkWithParams href={href} className={className}>
        {children}
      </AuthLinkWithParams>
    </Suspense>
  );
}
