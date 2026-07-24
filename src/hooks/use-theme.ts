'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemeId = 'nocturne' | 'pirate' | 'futurist';

const STORAGE_KEY = 'quest-theme';
const VALID_THEMES: ThemeId[] = ['nocturne', 'pirate', 'futurist'];
const DEFAULT_THEME: ThemeId = 'nocturne';

function readStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return (VALID_THEMES as string[]).includes(stored ?? '') ? (stored as ThemeId) : DEFAULT_THEME;
}

export function useTheme() {
  // Always start from the default so the server-rendered markup and the
  // first client render match; the persisted theme (if any) is applied
  // right after mount via effect, avoiding a hydration mismatch that
  // React would otherwise leave un-patched on the DOM.
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    setThemeIdState(readStoredTheme());
  }, []);

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
