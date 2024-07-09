import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import global_es from './es/global.json'
import global_en from './en/global.json'

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
    },
  })

export default i18n