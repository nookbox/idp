import Link from 'next/link';

export function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="relative z-10 flex items-center justify-between border-b border-white/10 px-8 py-5">
      <Link href="/" className="text-2xl font-black tracking-tight text-red-600">
        NOOK
      </Link>
      {children}
    </header>
  );
}
