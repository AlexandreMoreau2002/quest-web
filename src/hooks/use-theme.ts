'use client';

import { useCallback, useState } from 'react';

export type ThemeId = 'nocturne' | 'pirate' | 'futurist';

const STORAGE_KEY = 'quest-theme';
const VALID_THEMES: ThemeId[] = ['nocturne', 'pirate', 'futurist'];

function readStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return 'nocturne';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return (VALID_THEMES as string[]).includes(stored ?? '') ? (stored as ThemeId) : 'nocturne';
}

export function useTheme() {
  const [themeId, setThemeIdState] = useState<ThemeId>(readStoredTheme);

  const setThemeId = useCallback((next: ThemeId) => {
    setThemeIdState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  return { themeId, setThemeId };
}

export const THEME_CLASS: Record<ThemeId, string> = {
  nocturne: 'qt-nocturne',
  pirate: 'qt-pirate',
  futurist: 'qt-futurist',
};
