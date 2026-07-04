import Image from 'next/image';
import Link from 'next/link';

export function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="relative z-10 flex items-center justify-between border-b border-white/10 px-8 py-5">
      <Link href="/">
        <Image
          src="/logo.png"
          alt="NOOKBOX"
          width={896}
          height={224}
          priority
          className="h-8 w-auto"
        />
      </Link>
      {children}
    </header>
  );
}
