import { Header } from '@/components/header';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="flex min-h-dvh items-center justify-center p-4 absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1B1136_0%,#0B0B14_70%)]">
        {children}
      </main>
    </>
  );
}
