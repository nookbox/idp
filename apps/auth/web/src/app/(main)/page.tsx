import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { AccountPage } from '@/features/account';

export default async function Home() {
  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: { cookie: (await headers()).get('cookie') ?? '' },
    },
  });

  if (!session) redirect('/signin');

  return <AccountPage />;
}
