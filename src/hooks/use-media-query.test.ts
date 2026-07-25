import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMediaQuery } from './use-media-query';

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(event: MediaQueryListEvent) => void> = [];
  const mql = {
    matches,
    media: '',
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.push(listener),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
  return { mql, listeners };
}

describe('useMediaQuery', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the current match state', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 760px)'));
    expect(result.current).toBe(true);
  });

  it('updates when the media query change event fires', () => {
    const { listeners } = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 760px)'));
    expect(result.current).toBe(false);

    act(() => listeners[0]?.({ matches: true } as MediaQueryListEvent));
    expect(result.current).toBe(true);
  });
});
