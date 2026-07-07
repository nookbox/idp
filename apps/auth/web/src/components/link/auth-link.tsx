'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

export default function AuthLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const qs = useSearchParams().toString();

  return (
    <Link href={qs ? `${href}?${qs}` : href} className={className}>
      {children}
    </Link>
  );
}
