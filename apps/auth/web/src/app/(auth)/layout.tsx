import { Header } from '@/components/header';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1B1136_0%,#0B0B14_70%)] flex-col">
      <Header />
      <main className="flex flex-1 justify-center px-4">{children}</main>
    </div>
  );
}
