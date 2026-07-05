import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default async function Home() {
  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: { cookie: (await headers()).get('cookie') ?? '' },
    },
  });

  if (!session) redirect('/signin');

  // TODO: 계정 account 세팅 페이지, https://myaccount.google.com/ 디자인 참고해서 작업할 예정
  return;
}
