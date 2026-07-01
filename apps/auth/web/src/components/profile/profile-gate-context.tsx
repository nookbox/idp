'use client';

import { createContext, useContext } from 'react';

const OpenAddProfileContext = createContext<(() => void) | null>(null);

export const OpenAddProfileProvider = OpenAddProfileContext.Provider;

export function useOpenAddProfile() {
  const open = useContext(OpenAddProfileContext);
  if (!open) {
    throw new Error('useOpenAddProfile must be used within <ProfileGate>');
  }
  return open;
}
