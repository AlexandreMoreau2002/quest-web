import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useTheme } from './use-theme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to nocturne when nothing is stored', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.themeId).toBe('nocturne');
  });

  it('persists the chosen theme to localStorage and reflects it on next mount', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setThemeId('pirate'));
    expect(result.current.themeId).toBe('pirate');
    expect(localStorage.getItem('quest-theme')).toBe('pirate');

    const { result: secondMount } = renderHook(() => useTheme());
    expect(secondMount.current.themeId).toBe('pirate');
  });

  it('ignores a corrupted stored value and falls back to nocturne', () => {
    localStorage.setItem('quest-theme', 'not-a-real-theme');
    const { result } = renderHook(() => useTheme());
    expect(result.current.themeId).toBe('nocturne');
  });
});
