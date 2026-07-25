import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';

export type SupportedLocale = 'fr' | 'en';
export const DEFAULT_LOCALE: SupportedLocale = 'fr';

if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    resources: { fr: { translation: fr }, en: { translation: en } },
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    interpolation: { escapeValue: false },
  });
}

export default i18next;
