import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import es from './locales/es.json';
import de from './locales/de.json';
import tr from './locales/tr.json';
import pt from './locales/pt.json';
import zh from './locales/zh.json';
import ru from './locales/ru.json';
import ko from './locales/ko.json';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  ar: { translation: ar },
  es: { translation: es },
  de: { translation: de },
  tr: { translation: tr },
  pt: { translation: pt },
  zh: { translation: zh },
  ru: { translation: ru },
  ko: { translation: ko },
};

const RTL_LANGS = ['ar'];

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('nexus-language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

// Apply lang and dir attributes immediately on load
(function applyLangOnInit() {
  const lang = localStorage.getItem('nexus-language') || 'en';
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', RTL_LANGS.includes(lang) ? 'rtl' : 'ltr');
})();

export default i18n;
