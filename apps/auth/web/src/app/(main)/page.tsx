import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { authClient } from '@/shared/api/auth-client';
import { AccountView } from '@/views/account';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; error?: string }>;
}) {
  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: { cookie: (await headers()).get('cookie') ?? '' },
    },
  });

  if (!session) redirect('/signin');

  const { verified, error } = await searchParams;

  return <AccountView verified={verified === '1'} verificationError={error} />;
}
