'use client';

import { useState } from 'react';
import { House, ShieldCheck, MonitorSmartphone, Blocks } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { OverviewSection } from './components/overview-section';
import { SecuritySection } from './components/security-section';
import { DevicesSection } from './components/devices-section';
import { ServicesSection } from './components/services-section';

const SECTIONS = [
  { key: 'overview', label: '개요', icon: House },
  { key: 'security', label: '보안', icon: ShieldCheck },
  { key: 'devices', label: '디바이스', icon: MonitorSmartphone },
  { key: 'services', label: '연결된 서비스', icon: Blocks },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

export function AccountPage() {
  const [section, setSection] = useState<SectionKey>('overview');
  const { data: session } = authClient.useSession();

  if (!session) return null;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="mb-8 text-3xl font-bold">계정</h1>

      <div className="flex flex-col gap-10 md:flex-row">
        <nav className="flex md:flex-col">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2 md:px-4 py-2.5 text-sm whitespace-nowrap transition-colors cursor-pointer',
                section === key
                  ? 'bg-accent font-semibold'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {section === 'overview' && <OverviewSection user={session.user} />}
          {section === 'security' && <SecuritySection />}
          {section === 'devices' && (
            <DevicesSection currentSessionToken={session.session.token} />
          )}
          {section === 'services' && <ServicesSection />}
        </div>
      </div>
    </main>
  );
}
