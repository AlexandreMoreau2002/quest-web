'use client';

import { useCallback, useSyncExternalStore } from 'react';

import i18n, { DEFAULT_LOCALE, type SupportedLocale } from '@/i18n/config';

const STORAGE_KEY = 'quest-locale';
const VALID_LOCALES: SupportedLocale[] = ['fr', 'en'];
const listeners = new Set<() => void>();

function readStoredLocale(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return (VALID_LOCALES as string[]).includes(stored ?? '') ? (stored as SupportedLocale) : DEFAULT_LOCALE;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function useLocale() {
  const locale = useSyncExternalStore(subscribe, readStoredLocale, () => DEFAULT_LOCALE);

  const setLocale = useCallback((next: SupportedLocale) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    void i18n.changeLanguage(next);
    listeners.forEach((listener) => listener());
  }, []);

  return { locale, setLocale };
}
