import { describe, expect, it } from 'vitest';

import en from './locales/en.json';
import fr from './locales/fr.json';

function collectKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, nested]) => collectKeys(nested, prefix ? `${prefix}.${key}` : key));
}

describe('locale key parity', () => {
  it('has the exact same key set in fr.json and en.json', () => {
    const frKeys = collectKeys(fr).sort();
    const enKeys = collectKeys(en).sort();
    expect(enKeys).toEqual(frKeys);
  });

  it('has no empty string values in either locale', () => {
    const emptyIn = (value: unknown, path = ''): string[] => {
      if (typeof value === 'string') return value.trim() === '' ? [path] : [];
      if (typeof value !== 'object' || value === null) return [];
      return Object.entries(value).flatMap(([key, nested]) => emptyIn(nested, path ? `${path}.${key}` : key));
    };
    expect(emptyIn(fr)).toEqual([]);
    expect(emptyIn(en)).toEqual([]);
  });
});
