// Central place that sets up translations for the whole app.
//
// HOW TO ADD A NEW LANGUAGE:
//   1. Copy locales/en.json to locales/<code>.json (use a standard code: 'de' for German, 'zh' for
//      Chinese, 'hi' for Hindi...).
//   2. Translate every value on the right of each ":" - never change the keys on the left.
//   3. Import it below and add one line to `resources` and one to `SUPPORTED_LANGUAGES`.
//   4. If the language reads right-to-left (Arabic, Hebrew, Urdu, Farsi...), add its code to RTL_LANGUAGES.
// No other code needs to change - every screen that uses t('...') picks up the new language automatically.
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import ar from './locales/ar.json';
import sw from './locales/sw.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
  { code: 'sw', label: 'Kiswahili' },
];

const RTL_LANGUAGES = ['ar'];
const STORAGE_KEY = 'appLanguage';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
  pt: { translation: pt },
  ar: { translation: ar },
  sw: { translation: sw },
};

function pickInitialLanguage() {
  const supportedCodes = SUPPORTED_LANGUAGES.map((l) => l.code);
  const deviceLocales = Localization.getLocales?.() || [];
  for (const locale of deviceLocales) {
    if (supportedCodes.includes(locale.languageCode)) return locale.languageCode;
  }
  return 'en';
}

let initialized = false;

// Call this once, before rendering the app, and await it (it may need to read AsyncStorage).
export async function setupI18n() {
  if (initialized) return i18n;
  let language;
  try {
    language = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    language = null;
  }
  if (!language) language = pickInitialLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

  applyTextDirection(language);
  initialized = true;
  return i18n;
}

// Switches language at runtime and remembers the choice. Returns true if the app needs a restart
// to finish applying it (only true when switching into/out of a right-to-left language, because
// RN only fully flips layout direction after a reload).
export async function changeLanguage(code) {
  const wasRtl = I18nManager.isRTL;
  await i18n.changeLanguage(code);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, code);
  } catch {
    // non-fatal: the choice just won't survive an app restart
  }
  const nowRtl = applyTextDirection(code);
  return wasRtl !== nowRtl;
}

function applyTextDirection(code) {
  const shouldBeRtl = RTL_LANGUAGES.includes(code);
  if (I18nManager.isRTL !== shouldBeRtl) {
    I18nManager.allowRTL(shouldBeRtl);
    I18nManager.forceRTL(shouldBeRtl);
  }
  return shouldBeRtl;
}

export default i18n;
