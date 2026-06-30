'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

export function useCurrentSearch() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => '',
  );
}
