import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import zh from '../locales/zh.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
    lng: localStorage.getItem('psy-language') || 'en', // 从 localStorage 读取，默认英文
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

// 监听语言变化，保存到 localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('psy-language', lng)
})

export default i18n
