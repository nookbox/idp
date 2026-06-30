import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'Nook Auth',
  description: 'Identity Provider for Nook',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-dvh bg-gray-50 antialiased flex items-center justify-center p-6">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
