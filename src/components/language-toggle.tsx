'use client';

import { useTranslation } from 'react-i18next';

import type { SupportedLocale } from '@/i18n/config';

interface LanguageToggleProps {
  activeLocale: SupportedLocale;
  onSelect: (locale: SupportedLocale) => void;
}

export function LanguageToggle({ activeLocale, onSelect }: LanguageToggleProps) {
  const { t } = useTranslation();

  return (
    <div className="language-toggle" role="group" aria-label={t('language.groupLabel')}>
      <button type="button" aria-pressed={activeLocale === 'fr'} onClick={() => onSelect('fr')}>
        {t('language.fr')}
      </button>
      <button type="button" aria-pressed={activeLocale === 'en'} onClick={() => onSelect('en')}>
        {t('language.en')}
      </button>
    </div>
  );
}
