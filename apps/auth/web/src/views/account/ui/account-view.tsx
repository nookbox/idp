'use client';

import { useVerificationResult } from '@/features/verify-email';
import { authClient } from '@/shared/api/auth-client';
import { useState } from 'react';
import type { SectionKey } from '../model/types';
import { AccountNav } from './account-nav';
import { DevicesSection } from './devices-section';
import { OverviewSection } from './overview-section';
import { SecuritySection } from './security-section';
import { ServicesSection } from './services-section';

export function AccountView({
  verified = false,
  verificationError,
}: {
  verified?: boolean;
  verificationError?: string;
}) {
  const [section, setSection] = useState<SectionKey>('overview');

  const { data: session } = authClient.useSession();

  useVerificationResult({ verified, error: verificationError });

  if (!session) return null;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="mb-8 text-3xl font-bold">계정</h1>

      <div className="flex flex-col gap-10 md:flex-row">
        <AccountNav section={section} onSectionChange={setSection} />

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
