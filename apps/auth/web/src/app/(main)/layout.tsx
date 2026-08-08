import { Header } from '@/widgets/header';
import { UserMenu } from '@/widgets/user-menu';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header>
        <UserMenu />
      </Header>
      {children}
    </div>
  );
}
