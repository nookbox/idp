import { Header } from '@/components/header';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="flex min-h-dvh items-center justify-center p-4 absolute inset-0 bg-[url('/bg-img.png')] bg-cover bg-center">
        {children}
      </main>
    </>
  );
}
