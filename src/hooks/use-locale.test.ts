import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useLocale } from './use-locale';

describe('useLocale', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to fr when nothing is stored', () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current.locale).toBe('fr');
  });

  it('persists the chosen locale to localStorage and reflects it on next mount', () => {
    const { result } = renderHook(() => useLocale());
    act(() => result.current.setLocale('en'));
    expect(result.current.locale).toBe('en');
    expect(localStorage.getItem('quest-locale')).toBe('en');

    const { result: secondMount } = renderHook(() => useLocale());
    expect(secondMount.current.locale).toBe('en');
  });

  it('ignores a corrupted stored value and falls back to fr', () => {
    localStorage.setItem('quest-locale', 'not-a-real-locale');
    const { result } = renderHook(() => useLocale());
    expect(result.current.locale).toBe('fr');
  });
});
