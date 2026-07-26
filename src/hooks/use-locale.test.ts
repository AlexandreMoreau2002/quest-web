import { createElement } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
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

  it('persists the chosen locale to localStorage and reflects it after mount', async () => {
    const { result } = renderHook(() => useLocale());
    act(() => result.current.setLocale('en'));
    expect(localStorage.getItem('quest-locale')).toBe('en');

    await waitFor(() => {
      expect(result.current.locale).toBe('en');
    });

    const { result: secondMount } = renderHook(() => useLocale());
    await waitFor(() => {
      expect(secondMount.current.locale).toBe('en');
    });
  });

  it('starts in French on the client and restores English after mount when English is persisted', async () => {
    localStorage.setItem('quest-locale', 'en');

    const renderLog: string[] = [];

    const { result } = renderHook(() => {
      const { locale } = useLocale();
      renderLog.push(locale);
      return { locale };
    });

    expect(renderLog[0]).toBe('fr');

    await waitFor(() => {
      expect(result.current.locale).toBe('en');
    });
  });

  it('ignores a corrupted stored value and falls back to fr', async () => {
    localStorage.setItem('quest-locale', 'not-a-real-locale');
    const { result } = renderHook(() => useLocale());
    expect(result.current.locale).toBe('fr');

    await waitFor(() => {
      expect(result.current.locale).toBe('fr');
    });
  });

  it('keeps the server snapshot in French when English is persisted', async () => {
    localStorage.setItem('quest-locale', 'en');

    const recoverableErrors: Error[] = [];
    const renderLog: string[] = [];

    function LocaleProbe() {
      const { locale } = useLocale();
      renderLog.push(locale);
      return createElement('span', { 'data-locale': locale }, locale);
    }

    const serverHtml = renderToString(createElement(LocaleProbe));
    expect(serverHtml).toContain('fr');

    const container = document.createElement('div');
    container.innerHTML = serverHtml;

    const root = hydrateRoot(container, createElement(LocaleProbe), {
      onRecoverableError: (error) => {
        recoverableErrors.push(error);
      },
    });

    try {
      expect(renderLog[0]).toBe('fr');

      await waitFor(() => {
        expect(container.querySelector('[data-locale]')?.textContent).toBe('en');
      });

      expect(recoverableErrors).toHaveLength(0);
    } finally {
      act(() => {
        root.unmount();
      });
    }
  });
});
