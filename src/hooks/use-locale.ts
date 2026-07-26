'use client';

import { useCallback, useEffect, useState } from 'react';

import i18n, { DEFAULT_LOCALE, type SupportedLocale } from '@/i18n/config';

const STORAGE_KEY = 'quest-locale';
const VALID_LOCALES: SupportedLocale[] = ['fr', 'en'];
const listeners = new Set<() => void>();

function readStoredLocale(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return (VALID_LOCALES as string[]).includes(stored ?? '') ? (stored as SupportedLocale) : DEFAULT_LOCALE;
}

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

export function useLocale() {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    const syncLocale = () => {
      setLocaleState(readStoredLocale());
    };

    syncLocale();
    listeners.add(syncLocale);

    return () => {
      listeners.delete(syncLocale);
    };
  }, []);

  const setLocale = useCallback((next: SupportedLocale) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    void i18n.changeLanguage(next);
    notifyListeners();
  }, []);

  return { locale, setLocale };
}
