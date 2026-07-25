'use client';

import { useEffect, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import i18n from './config';
import { useLocale } from '@/hooks/use-locale';

export function I18nProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();

  useEffect(() => {
    if (i18n.language !== locale) void i18n.changeLanguage(locale);
  }, [locale]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
