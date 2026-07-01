import { ProfileGate } from '@/components/profile';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-dvh">
      <ProfileGate />
    </main>
  );
}
