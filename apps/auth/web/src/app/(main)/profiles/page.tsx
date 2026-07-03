'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileGate } from '@/components/profile';
import { authClient } from '@/lib/auth-client';

export default function ProfilesPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) router.replace('/signin');
  }, [isPending, session, router]);

  if (!session) return null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center">
      <ProfileGate />
    </main>
  );
}
