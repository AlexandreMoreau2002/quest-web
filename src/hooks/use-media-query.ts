'use client';

import { useState, useSyncExternalStore } from 'react';

class MediaQueryStore {
  private value: boolean;

  constructor(private query: string) {
    this.value = typeof window !== 'undefined' ? window.matchMedia(query).matches : false;
  }

  getSnapshot = () => this.value;

  getServerSnapshot = () => false;

  subscribe = (onStoreChange: () => void) => {
    const mql = window.matchMedia(this.query);
    this.value = mql.matches;
    const handleChange = (event: MediaQueryListEvent) => {
      this.value = event.matches;
      onStoreChange();
    };
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  };
}

export function useMediaQuery(query: string): boolean {
  const [store] = useState(() => new MediaQueryStore(query));
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
