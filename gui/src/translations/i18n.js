import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import global_es from './es/global.json'
import global_en from './en/global.json'
import global_fr from './fr/global.json'
import global_de from './de/global.json' 
import global_it from './it/global.json'
import global_pt from './pt/global.json'
import global_ja from './ja/global.json'
import global_zh from './zh/global.json'
import global_ar from './ar/global.json'
import global_ko from './ko/global.json'
import global_ru from './ru/global.json'
import global_hi from './hi/global.json'

i18n
  .use(initReactI18next)
  .init({
    debug: true,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: global_en,
      },
      es: {
        translation: global_es,
      },
      fr: {
        translation: global_fr,
      },
      de: {
        translation: global_de,
      },
      it: {
        translation: global_it,
      },
      pt: {
        translation: global_pt,
      },
      ja: {
        translation: global_ja,
      },
      zh: {
        translation: global_zh,
      },
      ar: {
        translation: global_ar,
      },
      ko: {
        translation: global_ko,
      },
      ru: {
        translation: global_ru,
      },
      hi: {
        translation: global_hi,
      },
    },
  })

export default i18n