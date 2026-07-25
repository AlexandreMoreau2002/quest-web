'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type ThemeId = 'nocturne' | 'pirate' | 'futurist';

const STORAGE_KEY = 'quest-theme';
const VALID_THEMES: ThemeId[] = ['nocturne', 'pirate', 'futurist'];
const DEFAULT_THEME: ThemeId = 'nocturne';
const listeners = new Set<() => void>();

function readStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return (VALID_THEMES as string[]).includes(stored ?? '') ? (stored as ThemeId) : DEFAULT_THEME;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function useTheme() {
  // Server snapshot always returns the default so the server-rendered markup
  // and the first client render match; the persisted theme (if any) is read
  // from localStorage on the client via getSnapshot, avoiding a hydration
  // mismatch that React would otherwise leave un-patched on the DOM.
  const themeId = useSyncExternalStore(subscribe, readStoredTheme, () => DEFAULT_THEME);

  const setThemeId = useCallback((next: ThemeId) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    listeners.forEach((listener) => listener());
  }, []);

  return { themeId, setThemeId };
}

export const THEME_CLASS: Record<ThemeId, string> = {
  nocturne: 'qt-nocturne',
  pirate: 'qt-pirate',
  futurist: 'qt-futurist',
};
